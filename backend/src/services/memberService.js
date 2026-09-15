'use strict';
const { Members, Books, Loans, Reservations, Penalties } = require('../repositories');
const { validateMemberInput, canTransition } = require('../domain/memberRules');
const { memberBarcode } = require('../domain/barcodeRules');
const { hash } = require('./authService');
const audit = require('./auditService');
const { badRequest, notFound } = require('../utils/errors');

const publicMember = (m) => {
  if (!m) return null;
  const { passwordHash, ...rest } = m;
  return rest;
};

function list({ q = '', role = '', status = '' } = {}) {
  const needle = q.trim().toLowerCase();
  return Members.all()
    .filter((m) => (!role || m.role === role) && (!status || m.status === status))
    .filter((m) => !needle || [m.memberId, m.name, m.dept, m.email].some((v) => String(v || '').toLowerCase().includes(needle)))
    .map(publicMember);
}

function create(actor, input) {
  const errors = validateMemberInput(input);
  if (Members.findOne((m) => m.memberId.toUpperCase() === String(input.memberId || '').toUpperCase())) {
    errors.push('memberId already exists');
  }
  if (errors.length) throw badRequest(errors.join('; '), errors);
  const member = Members.insert({
    name: input.name.trim(), role: input.role, memberId: input.memberId.trim().toUpperCase(),
    email: input.email || null, dept: input.dept || null, year: input.year || null,
    status: 'ACTIVE', barcode: memberBarcode(input.memberId),
    passwordHash: hash(input.password || 'College@123')
  });
  audit.record(actor, 'MEMBER_CREATE', 'Member', member.id, null, publicMember(member));
  return publicMember(member);
}

function update(actor, id, patch) {
  const before = audit.snapshotOf(Members, id);
  if (!before) throw notFound('Member not found');
  const clean = {};
  for (const k of ['name', 'email', 'dept', 'year']) if (patch[k] !== undefined) clean[k] = patch[k];
  const member = Members.update(id, clean);
  audit.record(actor, 'MEMBER_UPDATE', 'Member', id, publicMember(before), publicMember(member));
  return publicMember(member);
}

function changeStatus(actor, id, status) {
  const member = Members.byId(id);
  if (!member) throw notFound('Member not found');
  if (!canTransition(member.status, status)) throw badRequest(`Cannot move member from ${member.status} to ${status}`);
  const updated = Members.update(id, { status });
  audit.record(actor, 'MEMBER_STATUS', 'Member', id, { status: member.status }, { status });
  return publicMember(updated);
}

function resetPassword(actor, id, newPassword) {
  const member = Members.byId(id);
  if (!member) throw notFound('Member not found');
  Members.update(id, { passwordHash: hash(newPassword || 'College@123') });
  audit.record(actor, 'MEMBER_PASSWORD_RESET', 'Member', id);
  return { ok: true };
}

const byMemberId = (memberId) => Members.findOne((m) => m.memberId === String(memberId || '').toUpperCase());

function unpaidDues(memberId) {
  return Penalties.find((p) => p.memberId === memberId && p.status === 'UNPAID')
    .reduce((sum, p) => sum + p.amount, 0);
}

function history(memberId) {
  const member = byMemberId(memberId);
  if (!member) throw notFound('Member not found');
  const titleOf = (bookId) => { const b = Books.byId(bookId); return b ? b.title : bookId; };
  return {
    member: publicMember(member),
    loans: Loans.find((l) => l.memberId === member.id).map((l) => ({ ...l, bookTitle: titleOf(l.bookId) })),
    reservations: Reservations.find((r) => r.memberId === member.id).map((r) => ({ ...r, bookTitle: titleOf(r.bookId) })),
    penalties: Penalties.find((p) => p.memberId === member.id)
  };
}

module.exports = { list, create, update, changeStatus, resetPassword, byMemberId, unpaidDues, history, publicMember };
