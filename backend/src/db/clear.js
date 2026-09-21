'use strict';
/**
 * Clear all data inside the software while preserving:
 * 1. Base circulation policies
 * 2. Institutional staff accounts (admin and librarian1)
 */
const { JsonStore, setStore } = require('./store');
const config = require('../config');
const { Users, Policies } = require('../repositories');
const { DEFAULT_POLICIES } = require('../domain/policyRules');
const bcrypt = require('bcryptjs');

const store = new JsonStore(config.dataDir);
setStore(store);

console.log('[reset] Clearing all collections from:', config.dataDir);
store.resetAll();

// Restore base policies
Policies.set(structuredClone(DEFAULT_POLICIES));

// Restore institutional staff accounts
const hash = (pw) => bcrypt.hashSync(pw, 10);
const staff = [
  { username: 'admin', name: 'KCT Library Administrator', role: 'ADMIN', password: 'Admin@123' },
  { username: 'librarian1', name: 'KCT Chief Librarian', role: 'LIBRARIAN', password: 'Librarian@123' }
];

for (const s of staff) {
  Users.insert({
    username: s.username,
    name: s.name,
    role: s.role,
    passwordHash: hash(s.password)
  });
}

console.log('[reset] All books, copies, loans, reservations, penalties, and members have been cleared.');
console.log('[reset] Staff accounts ready: admin / Admin@123, librarian1 / Librarian@123');
