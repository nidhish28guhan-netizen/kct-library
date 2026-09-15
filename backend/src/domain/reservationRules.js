'use strict';
/*
 * Reservation queue rules. Priority: FACULTY before STUDENT, then FIFO by
 * reservation time, then memberId for determinism. Statuses:
 * WAITING -> READY (a copy was dispatched) -> COMPLETED (collected) / EXPIRED / CANCELLED
 */
const ROLE_RANK = { FACULTY: 0, STUDENT: 1 };

function orderQueue(reservations) {
  return [...reservations].sort((a, b) =>
    (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9) ||
    String(a.createdAt).localeCompare(String(b.createdAt)) ||
    String(a.memberId).localeCompare(String(b.memberId)));
}

/**
 * Guard decision for a new reservation.
 * codes: BOOK_AVAILABLE | DUPLICATE | LIMIT | QUEUE_FULL
 */
function canReserve({ anyCopyAvailable, alreadyActive, activeForThisMember, memberLimit, queueLength, queueLimit }) {
  if (anyCopyAvailable) return { ok: false, code: 'BOOK_AVAILABLE' };
  if (alreadyActive) return { ok: false, code: 'DUPLICATE' };
  if (activeForThisMember >= memberLimit) return { ok: false, code: 'LIMIT' };
  if (queueLength >= queueLimit) return { ok: false, code: 'QUEUE_FULL' };
  return { ok: true, position: queueLength + 1 };
}

function positionOf(orderedQueue, reservationId) {
  const i = orderedQueue.findIndex((r) => r.id === reservationId);
  return i === -1 ? null : i + 1;
}

const ACTIVE_STATES = ['WAITING', 'READY'];
const isOpen = (r) => ACTIVE_STATES.includes(r.status);

/** After a cancel/complete, who (if anyone) becomes READY next. */
function nextWaiting(orderedQueue) {
  return orderedQueue.find((r) => r.status === 'WAITING') || null;
}

module.exports = { orderQueue, canReserve, positionOf, isOpen, nextWaiting, ACTIVE_STATES };
