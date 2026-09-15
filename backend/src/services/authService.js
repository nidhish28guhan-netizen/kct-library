'use strict';
const bcrypt = require('bcryptjs');
const { Users, Members } = require('../repositories');
const { signToken } = require('../middleware/auth');
const { normalizeIdentifier } = require('../domain/memberRules');
const { badCredentials } = require('../utils/errors');
const audit = require('./auditService');

/**
 * One identifier space: staff sign in with their username, students/faculty
 * with their member (roll) number. Case-insensitive; password case-sensitive.
 */
function resolveByIdentifier(identifier) {
  const id = normalizeIdentifier(identifier);
  const user = Users.findOne((u) => normalizeIdentifier(u.username) === id);
  if (user) return { kind: 'staff', record: user };
  const member = Members.findOne((m) => normalizeIdentifier(m.memberId) === id);
  if (member) return { kind: 'member', record: member };
  return null;
}

function login({ identifier, password }) {
  const found = resolveByIdentifier(identifier);
  if (!found || !bcrypt.compareSync(String(password || ''), found.record.passwordHash)) {
    throw badCredentials();
  }
  const r = found.record;
  const principal = found.kind === 'staff'
    ? { id: r.id, name: r.name, role: r.role, username: r.username, memberId: null }
    : { id: r.id, name: r.name, role: r.role, username: r.memberId, memberId: r.memberId };
  audit.record({ id: r.id, name: r.name }, 'LOGIN', found.kind === 'staff' ? 'User' : 'Member', r.id);
  return { token: signToken(principal), user: principal };
}

function hash(pw) { return bcrypt.hashSync(String(pw), 10); }

function createStaffUser({ username, name, role, password }) {
  if (!username || !name || !password) throw new Error('username, name and password are required');
  if (!['LIBRARIAN', 'ADMIN'].includes(role)) throw new Error('staff role must be LIBRARIAN or ADMIN');
  if (Users.findOne((u) => normalizeIdentifier(u.username) === normalizeIdentifier(username))) {
    throw new Error('username already exists');
  }
  return Users.insert({ username, name, role, passwordHash: hash(password) });
}

module.exports = { login, hash, createStaffUser, resolveByIdentifier };
