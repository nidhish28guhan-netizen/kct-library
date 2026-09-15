'use strict';
const DAY = 24 * 60 * 60 * 1000;
const dayStart = (d) => new Date(new Date(d).toISOString().slice(0, 10) + 'T00:00:00Z');

/** dueDate = issue date + loanDays, at 23:59 local (stored UTC day-end). */
function computeDueDate(issueDate, loanDays) {
  const d = dayStart(issueDate);
  d.setUTCDate(d.getUTCDate() + Number(loanDays));
  d.setUTCHours(23, 59, 59, 0);
  return d.toISOString();
}

function isOverdue(loan, now = new Date()) {
  return !loan.returnDate && new Date(loan.dueDate) < now;
}

/** Whole calendar days late (0 when on time; day 14 of 14 is on time). */
function daysLate(returnDate, dueDate) {
  const diff = dayStart(returnDate).getTime() - dayStart(dueDate).getTime();
  return diff <= 0 ? 0 : Math.floor(diff / DAY);
}

function daysUntil(loan, now = new Date()) {
  return Math.ceil((new Date(loan.dueDate).getTime() - now.getTime()) / DAY);
}

/**
 * Decision inputs -> eligibility verdict with machine-readable reasons.
 * reasons: MEMBER_INACTIVE | BORROW_LIMIT | FINE_BLOCK
 */
function canIssue({ member, activeCount, limit, unpaidDues, blockThreshold }) {
  const reasons = [];
  if (!member || member.status !== 'ACTIVE') reasons.push('MEMBER_INACTIVE');
  if (activeCount >= limit) reasons.push('BORROW_LIMIT');
  if (unpaidDues >= blockThreshold) reasons.push('FINE_BLOCK');
  return { ok: reasons.length === 0, reasons };
}

/**
 * Renewal rules: within renewLimit, not overdue, and nobody waiting in the
 * reservation queue for this book. Reasons: RENEW_LIMIT | RENEW_OVERDUE | RENEW_RESERVED
 */
function canRenew({ renewalsUsed, renewLimit, overdue, queueWaiting }) {
  const reasons = [];
  if (overdue) reasons.push('RENEW_OVERDUE');
  if (queueWaiting) reasons.push('RENEW_RESERVED');
  if (renewalsUsed >= renewLimit) reasons.push('RENEW_LIMIT');
  return { ok: reasons.length === 0, reasons };
}

module.exports = { DAY, computeDueDate, isOverdue, daysLate, daysUntil, canIssue, canRenew };
