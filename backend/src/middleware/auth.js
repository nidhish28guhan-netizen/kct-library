'use strict';
const jwt = require('jsonwebtoken');
const { jwtSecret, tokenExpiry } = require('../config');
const { badCredentials, unauthorized, forbidden } = require('../utils/errors');
const { STAFF } = require('../domain/memberRules');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, username: user.username || null, memberId: user.memberId || null },
    jwtSecret, { expiresIn: tokenExpiry });
}

function verifyToken(token) {
  try { return jwt.verify(token, jwtSecret); } catch { throw unauthorized('Session expired — sign in again'); }
}

/** Express middleware: authenticate + role guard factories. */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(badCredentialsSafe());
  try {
    req.user = verifyToken(token);
    next();
  } catch (e) { next(e); }
}
function badCredentialsSafe() { return unauthorized(); }

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
const requireStaff = () => requireRole(...STAFF);

module.exports = { signToken, verifyToken, authenticate, requireRole, requireStaff };
