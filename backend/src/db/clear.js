'use strict';
/**
 * Clear all data inside the software, restoring only the base circulation
 * policies. No staff accounts are created here — an administrator creates
 * accounts through the staff-account API (ADMIN only). Run seed.js for the
 * demo dataset instead.
 */
const { JsonStore, setStore } = require('./store');
const config = require('../config');
const { Policies } = require('../repositories');
const { DEFAULT_POLICIES } = require('../domain/policyRules');

const store = new JsonStore(config.dataDir);
setStore(store);

console.log('[reset] Clearing all collections from:', config.dataDir);
store.resetAll();

// Restore base policies
Policies.set(structuredClone(DEFAULT_POLICIES));

console.log('[reset] All books, copies, loans, reservations, penalties, members and users have been cleared.');
console.log('[reset] Policies restored. Create staff accounts via POST /api/admin/users (ADMIN).');
