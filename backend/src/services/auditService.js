'use strict';
const { Audit } = require('../repositories');

function record(actor, action, entity, entityId, before = null, after = null) {
  return Audit.insert({
    actorId: actor ? actor.sub || actor.id || 'system' : 'system',
    actorName: actor ? actor.name || 'system' : 'system',
    action, entity, entityId, before, after, ts: new Date().toISOString()
  });
}

/** Snapshot of a record BEFORE mutation (the RES-001 lesson: never read state after mutating it). */
function snapshotOf(repo, id) {
  const r = repo.byId(id);
  return r ? structuredClone(r) : null;
}

module.exports = { record, snapshotOf };
