'use strict';
const ROLES = ['STUDENT', 'FACULTY', 'LIBRARIAN', 'ADMIN'];
const STAFF = ['LIBRARIAN', 'ADMIN'];
const MEMBER_STATUSES = ['ACTIVE', 'SUSPENDED', 'BLACKLISTED'];
/* status transition matrix: from -> allowed to */
const TRANSITIONS = {
  ACTIVE: ['SUSPENDED', 'BLACKLISTED'],
  SUSPENDED: ['ACTIVE', 'BLACKLISTED'],
  BLACKLISTED: ['ACTIVE']
};

function normalizeIdentifier(s) {
  return String(s || '').trim().toLowerCase();
}

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function validateMemberInput({ name, role, memberId, email }) {
  const errors = [];
  if (!name || !String(name).trim()) errors.push('name is required');
  if (!ROLES.includes(role)) errors.push('role must be STUDENT or FACULTY');
  if (!memberId || !/^[A-Z]{2,5}\d{3,6}$/i.test(String(memberId).trim())) {
    errors.push('memberId must look like a roll number, e.g. CSE2201');
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push('email is invalid');
  return errors;
}

/** A member may borrow only when ACTIVE. */
function isActiveMember(member) { return member && member.status === 'ACTIVE'; }

/** RBAC helper: staff always allowed; otherwise subject must be the caller. */
function selfOrStaff(user, memberId) {
  if (STAFF.includes(user.role)) return true;
  return user.memberId === memberId || user.id === memberId;
}

function isStaff(user) { return STAFF.includes(user.role); }

module.exports = { ROLES, STAFF, MEMBER_STATUSES, TRANSITIONS, normalizeIdentifier, canTransition, validateMemberInput, isActiveMember, selfOrStaff, isStaff };
