'use strict';
const { Books, Copies, Loans, Reservations, Penalties, Members, Policies } = require('../repositories');
const { DEFAULT_POLICIES } = require('../domain/policyRules');
const { computeDueDate, daysLate, canIssue, canRenew, isOverdue } = require('../domain/loanRules');
const { canIssueCopy } = require('../domain/copyRules');
const { calculatePenalty } = require('../domain/penaltyRules');
const { orderQueue, isOpen } = require('../domain/reservationRules');
const { conflict, notFound, badRequest } = require('../utils/errors');
const memberService = require('./memberService');
const reservationService = require('./reservationService');
const audit = require('./auditService');
const notify = require('./notifyService');

const policies = () => Policies.get() || DEFAULT_POLICIES;
const rolePolicy = (role) => {
  const p = policies();
  return { ...(p.roles[role] || p.roles.STUDENT), ...p.global };
};

function resolveMember(memberIdentifier) {
  const m = memberService.byMemberId(memberIdentifier) || Members.byId(memberIdentifier);
  if (!m) throw notFound(`No member "${memberIdentifier}"`);
  return m;
}

const activeLoansOf = (memberId) => Loans.find((l) => l.memberId === memberId && !l.returnDate);

function eligibility(memberIdentifier) {
  const member = resolveMember(memberIdentifier);
  const pol = rolePolicy(member.role);
  const loans = activeLoansOf(member.id);
  const dues = memberService.unpaidDues(member.id);
  const verdict = canIssue({ member, activeCount: loans.length, limit: pol.maxBooks, unpaidDues: dues, blockThreshold: pol.blockThreshold });
  return {
    member: memberService.publicMember(member),
    activeLoans: loans.map((l) => ({ ...l })),
    issuedCount: loans.length,
    limit: pol.maxBooks,
    unpaidDues: dues,
    blockThreshold: pol.blockThreshold,
    renewLimit: pol.renewLimit,
    loanDays: pol.loanDays,
    canBorrow: verdict.ok,
    reasons: verdict.reasons
  };
}

function issue(actor, { memberIdentifier, barcode }) {
  if (!memberIdentifier || !barcode) throw badRequest('memberIdentifier and barcode are required');
  const el = eligibility(memberIdentifier);
  if (!el.canBorrow) throw conflict('NOT_ELIGIBLE', `Member cannot borrow: ${el.reasons.join(', ')}`, el.reasons);
  const copy = Copies.findOne((c) => c.barcode === String(barcode).toUpperCase().trim());
  const copyVerdict = canIssueCopy(copy, el.member.id);
  if (!copyVerdict.ok) {
    throw conflict(copyVerdict.code === 'COPY_NOT_FOUND' ? 'COPY_NOT_FOUND' : 'COPY_NOT_AVAILABLE',
      copyVerdict.code === 'COPY_NOT_FOUND' ? 'Unknown copy barcode' : 'That copy is not available for issue');
  }
  const book = Books.byId(copy.bookId);
  const now = new Date();
  const loan = Loans.insert({
    memberId: el.member.id, memberName: el.member.name, memberCode: el.member.memberId,
    bookId: book.id, bookTitle: book.title, copyId: copy.id, barcode: copy.barcode,
    issueDate: now.toISOString(), dueDate: computeDueDate(now, rolePolicy(el.member.role).loanDays),
    returnDate: null, renewalsUsed: 0, status: 'ACTIVE', issuedBy: actor.name || actor.sub
  });
  // If this member is the holder of a READY reservation for the copy, collecting it completes the hold.
  const openRes = Reservations.findOne((r) => r.memberId === el.member.id && r.bookId === book.id && isOpen(r));
  if (openRes && copy.status === 'RESERVED' && copy.heldFor === el.member.id) {
    Reservations.update(openRes.id, { status: 'COMPLETED', completedAt: now.toISOString() });
  }
  Copies.update(copy.id, { status: 'ISSUED', heldFor: null });
  notify.notify(el.member.id, 'BOOK_ISSUED', 'Book issued',
    `"${book.title}" is due ${loan.dueDate.slice(0, 10)}.`, loan.id);
  audit.record(actor, 'ISSUE', 'Loan', loan.id, null, { member: el.member.memberId, title: book.title, dueDate: loan.dueDate });
  return { loan, copy: Copies.byId(copy.id), book, member: el.member, receipt: { dueDate: loan.dueDate } };
}

function returnCopy(actor, { barcode }) {
  const copy = Copies.findOne((c) => c.barcode === String(barcode).toUpperCase().trim());
  if (!copy) throw notFound('Unknown copy barcode');
  const loan = Loans.findOne((l) => l.copyId === copy.id && !l.returnDate);
  if (!loan) throw conflict('NO_ACTIVE_LOAN', 'This copy is not on loan');
  const now = new Date();
  const late = daysLate(now.toISOString(), loan.dueDate);
  const finePerDay = policies().global.finePerDay;
  const amount = calculatePenalty(late, finePerDay);
  let penalty = null;
  if (amount > 0) {
    penalty = Penalties.insert({
      memberId: loan.memberId, memberName: loan.memberName, loanId: loan.id,
      bookTitle: loan.bookTitle, amount, reason: `${late} day(s) late on "${loan.bookTitle}"`,
      status: 'UNPAID', issuedAt: now.toISOString()
    });
  }
  Loans.update(loan.id, { returnDate: now.toISOString(), status: 'RETURNED', lateDays: late, penaltyId: penalty ? penalty.id : null });
  const effect = reservationService.dispatchNext(loan.bookId, copy.id);
  const member = Members.byId(loan.memberId);
  notify.notify(loan.memberId, 'BOOK_RETURNED', 'Book returned',
    `"${loan.bookTitle}" returned on time.${late ? ` A penalty of ₹${amount.toFixed(2)} applies.` : ''}`, loan.id);
  audit.record(actor, 'RETURN', 'Loan', loan.id, structuredClone(loan),
    { returnDate: now.toISOString(), lateDays: late, penalty: amount, dispatched: effect ? effect.dispatched : null });
  return { loan: Loans.byId(loan.id), lateDays: late, penalty, dispatch: effect ? effect.dispatched : null, member: memberService.publicMember(member), book: Books.byId(loan.bookId) };
}

function renew(actor, loanId) {
  const loan = Loans.byId(loanId);
  if (!loan || loan.returnDate) throw notFound('Active loan not found');
  const pol = rolePolicy(loan.memberRole || (Members.byId(loan.memberId) || {}).role || 'STUDENT');
  const queueWaiting = orderQueue(
    Reservations.find((r) => r.bookId === loan.bookId && isOpen(r))
      .map((r) => ({ ...r, role: (Members.byId(r.memberId) || {}).role || 'STUDENT' }))
  ).some((r) => r.status === 'WAITING');
  const verdict = canRenew({ renewalsUsed: loan.renewalsUsed, renewLimit: pol.renewLimit, overdue: isOverdue(loan), queueWaiting });
  if (!verdict.ok) throw conflict(verdict.reasons[0], 'Renewal refused', verdict.reasons);
  const updated = Loans.update(loanId, { dueDate: computeDueDate(new Date(), pol.loanDays), renewalsUsed: loan.renewalsUsed + 1 });
  notify.notify(loan.memberId, 'LOAN_RENEWED', 'Loan renewed',
    `"${loan.bookTitle}" is now due ${updated.dueDate.slice(0, 10)}.`, loanId);
  audit.record(actor, 'RENEW', 'Loan', loanId, { dueDate: loan.dueDate }, { dueDate: updated.dueDate });
  return { loan: updated };
}

module.exports = { eligibility, issue, returnCopy, renew, activeLoansOf, resolveMember };
