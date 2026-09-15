'use strict';
const { Policies, Audit, Users, Loans, Penalties } = require('../repositories');
const { DEFAULT_POLICIES, mergePolicies } = require('../domain/policyRules');
const { isOverdue, daysLate, daysUntil } = require('../domain/loanRules');
const { notFound } = require('../utils/errors');
const notify = require('./notifyService');
const reservationService = require('./reservationService');
const { createStaffUser } = require('./authService');

const getPolicies = () => Policies.get() || DEFAULT_POLICIES;
const updatePolicies = (patch) => Policies.set(mergePolicies(getPolicies(), patch));

function auditList({ q = '', entity = '', limit = 100 } = {}) {
  const needle = q.trim().toLowerCase();
  return Audit.all()
    .filter((a) => !entity || a.entity === entity)
    .filter((a) => !needle || [a.actorName, a.action, a.entity, a.entityId, JSON.stringify(a.after)]
      .some((v) => String(v).toLowerCase().includes(needle)))
    .slice(-limit)
    .reverse();
}

function users() {
  return Users.all().map(({ passwordHash, ...u }) => u);
}

/**
 * Daily sweep (US-35): expire stale READY holds, alert overdue loans (and
 * ensure their penalty exists), warn due-soon loans. Idempotent per loan —
 * safe to run repeatedly.
 */
function scan() {
  const pol = getPolicies().global;
  const now = new Date();
  let alerts = 0;
  alerts += reservationService.expireReadyHolds().length;
  for (const loan of Loans.find((l) => !l.returnDate)) {
    if (isOverdue(loan, now)) {
      const left = daysLate(now.toISOString(), loan.dueDate);
      if (!Penalties.findOne((p) => p.loanId === loan.id && p.status === 'UNPAID')) {
        Penalties.insert({
          memberId: loan.memberId, memberName: loan.memberName, loanId: loan.id,
          bookTitle: loan.bookTitle, amount: Number((left * pol.finePerDay).toFixed(2)),
          reason: `Automated sweep: ${left} day(s) overdue`, status: 'UNPAID', issuedAt: now.toISOString()
        });
      }
      notify.notify(loan.memberId, 'OVERDUE', 'Book overdue',
        `"${loan.bookTitle}" was due ${loan.dueDate.slice(0, 10)}. Return it to stop penalties accruing.`, loan.id);
    } else {
      const d = daysUntil(loan, now);
      if (d >= 0 && d <= pol.dueSoonDays) {
        notify.notify(loan.memberId, 'DUE_SOON', 'Due soon',
          `"${loan.bookTitle}" is due ${loan.dueDate.slice(0, 10)}.`, loan.id);
      }
    }
    alerts += 1;
  }
  return { checked: alerts };
}

function createStaff(input) { return createStaffUser(input); }

module.exports = { getPolicies, updatePolicies, auditList, users, scan, createStaff };
