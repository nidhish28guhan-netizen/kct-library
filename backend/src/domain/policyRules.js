'use strict';
/* Pure policy defaults + safe merge (unknown keys rejected). */
const DEFAULT_POLICIES = {
  roles: {
    STUDENT: { loanDays: 14, maxBooks: 3, maxReservations: 3 },
    FACULTY: { loanDays: 30, maxBooks: 5, maxReservations: 5 }
  },
  global: {
    finePerDay: 1,          // INR per late day
    blockThreshold: 50,     // unpaid dues at/above which borrowing is blocked
    renewLimit: 2,          // renewals allowed per loan
    holdDays: 48,           // hours a READY reservation stays before expiry
    dueSoonDays: 3,         // "due soon" notification window
    queueLimit: 5           // max active reservations per book queue
  }
};

function mergePolicies(current, patch) {
  const out = structuredClone(current || DEFAULT_POLICIES);
  if (patch && patch.roles) {
    for (const role of Object.keys(out.roles)) {
      const rp = patch.roles[role];
      if (!rp) continue;
      for (const key of Object.keys(out.roles[role])) {
        if (typeof rp[key] === 'number' && rp[key] > 0) out.roles[role][key] = Math.floor(rp[key]);
      }
    }
  }
  if (patch && patch.global) {
    for (const key of Object.keys(out.global)) {
      const v = patch.global[key];
      if (typeof v === 'number' && v >= 0) out.global[key] = v;
    }
  }
  return out;
}

function policyFor(policies, role) {
  return { ...(policies.roles[role] || policies.roles.STUDENT), ...policies.global, role };
}

module.exports = { DEFAULT_POLICIES, mergePolicies, policyFor };
