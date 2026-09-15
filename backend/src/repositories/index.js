'use strict';
const { Repository } = require('./repository');
const { getStore } = require('../db/store');

const Users = new Repository('users', 'USR');
const Members = new Repository('members', 'MB');
const Books = new Repository('books', 'BK');
const Copies = new Repository('copies', 'CP');
const Loans = new Repository('loans', 'LN');
const Reservations = new Repository('reservations', 'RS');
const Penalties = new Repository('penalties', 'PN');
const Notifications = new Repository('notifications', 'NT');
const Audit = new Repository('audit', 'AU');

/* Policies are a single mutable document. */
const Policies = {
  get() {
    const rows = getStore().all('policies');
    return rows.length ? rows[0] : null;
  },
  set(doc) {
    const store = getStore();
    store.replaceAll('policies', [{ id: 'POLICY', ...doc, updatedAt: new Date().toISOString() }]);
    return doc;
  }
};

module.exports = { Users, Members, Books, Copies, Loans, Reservations, Penalties, Notifications, Audit, Policies };
