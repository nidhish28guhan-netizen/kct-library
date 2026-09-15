'use strict';
const { Penalties } = require('../repositories');
const { notFound } = require('../utils/errors');
const audit = require('./auditService');

const listFor = (memberId) => Penalties.find((p) => p.memberId === memberId)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const listAll = (status = '') => Penalties.all()
  .filter((p) => !status || p.status === status)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

function clear(actor, id) {
  const before = audit.snapshotOf(Penalties, id);
  if (!before) throw notFound('Penalty not found');
  if (before.status === 'PAID') return before;
  const paid = Penalties.update(id, {
    status: 'PAID', paidAt: new Date().toISOString(),
    receipt: `RCPT-${Date.now().toString(36).toUpperCase()}`, receivedBy: actor.name || actor.sub
  });
  audit.record(actor, 'PENALTY_CLEAR', 'Penalty', id, before, paid);
  return paid;
}

module.exports = { listFor, listAll, clear };
