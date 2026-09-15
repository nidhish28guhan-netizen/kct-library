'use strict';
const { Notifications } = require('../repositories');

/** Idempotent in-app notification: one unread alert per (type, entity, member). */
function notify(memberId, type, title, message, entity = null) {
  const dup = Notifications.findOne((n) =>
    n.memberId === memberId && n.type === type && !n.readAt &&
    (!entity || (n.entity === entity)));
  if (dup) return dup;
  return Notifications.insert({ memberId, type, title, message, entity, readAt: null });
}

function mine(memberId) {
  return Notifications.find((n) => n.memberId === memberId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function markRead(actor, id) {
  const n = Notifications.byId(id);
  if (!n) return null;
  return Notifications.update(id, { readAt: new Date().toISOString() });
}

module.exports = { notify, mine, markRead };
