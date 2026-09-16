'use strict';
const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { STAFF } = require('../domain/memberRules');
const { notFound, forbidden } = require('../utils/errors');
const { Members, Loans, Reservations, Notifications } = require('../repositories');
const authService = require('../services/authService');
const memberService = require('../services/memberService');
const catalogueService = require('../services/catalogueService');
const copyService = require('../services/copyService');
const circulation = require('../services/circulationService');
const reservations = require('../services/reservationService');
const penalties = require('../services/penaltyService');
const recommendations = require('../services/recommendationService');
const reports = require('../services/reportService');
const admin = require('../services/adminService');
const notify = require('../services/notifyService');

const wrap = (fn) => (req, res, next) => { try { fn(req, res, next); } catch (e) { next(e); } };
const staffOnly = requireRole(...STAFF);
const librarianOnly = requireRole('LIBRARIAN', 'ADMIN');
const adminOnly = requireRole('ADMIN');
const memberOnly = requireRole('STUDENT', 'FACULTY');
const isStaff = (req) => STAFF.includes(req.user.role);

/** Members may read only their own records; staff read anything. */
function assertSelfOrStaff(req, memberId) {
  if (isStaff(req)) return;
  if (req.user.sub !== memberId) throw forbidden('You may view only your own records');
}

const router = express.Router();

/* ---------- auth ---------- */
router.post('/auth/login', wrap((req, res) => res.json(authService.login(req.body || {}))));
router.get('/auth/me', authenticate, wrap((req, res) => {
  const { sub, iat, exp, ...principal } = req.user; // same shape as /auth/login's user
  res.json({ id: sub, ...principal });
}));

router.use(authenticate); // everything below requires a session

/* ---------- catalogue ---------- */
router.get('/books', wrap((req, res) => res.json(catalogueService.search(req.query))));
router.get('/books/meta/categories', wrap((req, res) => res.json(catalogueService.categories())));
router.get('/books/:id', wrap((req, res) => res.json(catalogueService.detail(req.params.id))));
router.get('/books/:id/similar', wrap((req, res) => res.json(recommendations.similarTo(req.params.id))));
router.post('/books', librarianOnly, wrap((req, res) => res.status(201).json(catalogueService.create(req.user, req.body))));
router.put('/books/:id', librarianOnly, wrap((req, res) => res.json(catalogueService.update(req.user, req.params.id, req.body))));
router.delete('/books/:id', adminOnly, wrap((req, res) => res.json(catalogueService.remove(req.user, req.params.id))));

/* ---------- copies & barcodes ---------- */
router.post('/books/:id/copies', librarianOnly, wrap((req, res) => res.status(201).json(copyService.addCopies(req.user, req.params.id, req.body))));
router.get('/barcodes/:barcode/svg', wrap((req, res) => res.type('image/svg+xml').send(copyService.svgFor(req.params.barcode))));
router.get('/barcodes/:barcode', wrap((req, res) => res.json(copyService.locate(req.params.barcode))));
router.put('/copies/:id', librarianOnly, wrap((req, res) => res.json(copyService.updateCopy(req.user, req.params.id, req.body))));

/* ---------- members ---------- */
router.get('/members', staffOnly, wrap((req, res) => res.json(memberService.list(req.query))));
router.post('/members', staffOnly, wrap((req, res) => res.status(201).json(memberService.create(req.user, req.body))));
router.put('/members/:id', staffOnly, wrap((req, res) => res.json(memberService.update(req.user, req.params.id, req.body))));
router.patch('/members/:id/status', adminOnly, wrap((req, res) => res.json(memberService.changeStatus(req.user, req.params.id, req.body.status))));
router.post('/members/:id/reset-password', staffOnly, wrap((req, res) => res.json(memberService.resetPassword(req.user, req.params.id, req.body.password))));
router.get('/members/:id/history', wrap((req, res) => {
  const member = Members.byId(req.params.id);
  if (!member) throw notFound('Member not found');
  assertSelfOrStaff(req, member.id);
  res.json(memberService.history(member.memberId));
}));

/* ---------- circulation ---------- */
router.get('/circulation/eligibility', librarianOnly, wrap((req, res) => res.json(circulation.eligibility(req.query.memberIdentifier))));
router.post('/circulation/issue', librarianOnly, wrap((req, res) => res.status(201).json(circulation.issue(req.user, req.body))));
router.post('/circulation/return', librarianOnly, wrap((req, res) => res.json(circulation.returnCopy(req.user, req.body))));
router.post('/circulation/renew', wrap((req, res) => {
  const loan = Loans.byId(req.body.loanId);
  if (!loan) throw notFound('Loan not found');
  assertSelfOrStaff(req, loan.memberId);
  res.json(circulation.renew(req.user, loan.id));
}));

/* ---------- reservations ---------- */
router.post('/reservations', memberOnly, wrap((req, res) => res.status(201).json(reservations.reserve(req.user, req.body))));
router.get('/reservations/mine', memberOnly, wrap((req, res) => res.json(reservations.mineFor(req.user.sub))));
router.get('/reservations/queue/:bookId', wrap((req, res) => res.json(reservations.queue(req.params.bookId).map(({ memberId, ...r }) => r))));
router.get('/reservations', staffOnly, wrap((req, res) => {
  if (req.query.bookId) return res.json(reservations.queue(req.query.bookId));
  res.json(Reservations.filter((r) => ['WAITING', 'READY'].includes(r.status)));
}));
router.delete('/reservations/:id', wrap((req, res) => {
  const r = Reservations.byId(req.params.id);
  if (!r) throw notFound('Reservation not found');
  assertSelfOrStaff(req, r.memberId);
  res.json(reservations.cancel(req.user, req.params.id, !isStaff(req)));
}));

/* ---------- penalties ---------- */
router.get('/penalties/mine', memberOnly, wrap((req, res) => res.json(penalties.listFor(req.user.sub))));
router.get('/penalties', staffOnly, wrap((req, res) => res.json(penalties.listAll(req.query.status))));
router.post('/penalties/:id/clear', staffOnly, wrap((req, res) => res.json(penalties.clear(req.user, req.params.id))));

/* ---------- recommendations ---------- */
router.get('/recommendations/for-me', wrap((req, res) => res.json(recommendations.forMe(req.user.sub, Number(req.query.limit) || 8))));

/* ---------- notifications ---------- */
router.get('/notifications', wrap((req, res) => res.json(notify.mine(req.user.sub))));
router.patch('/notifications/:id/read', wrap((req, res) => {
  const n = Notifications.byId(req.params.id);
  if (!n) throw notFound('Notification not found');
  assertSelfOrStaff(req, n.memberId);
  res.json(notify.markRead(req.user, req.params.id));
}));
router.post('/notifications/scan', staffOnly, wrap((req, res) => res.json(admin.scan())));

/* ---------- reports ---------- */
router.get('/reports/summary', staffOnly, wrap((req, res) => res.json(reports.summary())));
router.get('/reports/overdue', staffOnly, wrap((req, res) => res.json(reports.overdueReport())));
router.get('/reports/circulation', staffOnly, wrap((req, res) => res.json(reports.circulationTrend(Number(req.query.days) || 14))));
router.get('/reports/popular', staffOnly, wrap((req, res) => res.json(reports.popularBooks())));
router.get('/reports/most-reserved', staffOnly, wrap((req, res) => res.json(reports.mostReserved())));

/* ---------- admin ---------- */
router.get('/admin/policies', staffOnly, wrap((req, res) => res.json(admin.getPolicies())));
router.put('/admin/policies', adminOnly, wrap((req, res) => res.json(admin.updatePolicies(req.body))));
router.get('/admin/audit', adminOnly, wrap((req, res) => res.json(admin.auditList(req.query))));
router.get('/admin/users', adminOnly, wrap((req, res) => res.json(admin.users())));
router.post('/admin/users', adminOnly, wrap((req, res) => res.status(201).json(admin.createStaff(req.body))));

module.exports = router;
