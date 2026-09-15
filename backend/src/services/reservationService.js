'use strict';
const { Books, Copies, Reservations, Loans, Members, Policies } = require('../repositories');
const { DEFAULT_POLICIES } = require('../domain/policyRules');
const { orderQueue, canReserve, isOpen, nextWaiting } = require('../domain/reservationRules');
const { conflict, notFound, badRequest } = require('../utils/errors');
const audit = require('./auditService');
const notify = require('./notifyService');

const policies = () => Policies.get() || DEFAULT_POLICIES;
const openForBook = (bookId) => Reservations.find((r) => r.bookId === bookId && isOpen(r));

function queue(bookId) {
  const withRole = openForBook(bookId).map((r) => {
    const m = Members.byId(r.memberId);
    return { ...r, role: m ? m.role : 'STUDENT', memberId: r.memberId };
  });
  return orderQueue(withRole).map((r, i) => ({ ...r, position: i + 1 }));
}

function reserve(user, { bookId }) {
  const book = Books.byId(bookId);
  if (!book) throw notFound('Book not found');
  const member = Members.byId(user.sub);
  if (!member) throw notFound('Member not found');
  const pol = policies();
  const rolePol = pol.roles[member.role] || pol.roles.STUDENT;
  const anyAvailable = Copies.find((c) => c.bookId === bookId).some((c) => c.status === 'AVAILABLE');
  const mine = openForBook(bookId).filter((r) => r.memberId === member.id);
  const activeForMe = Reservations.find((r) => r.memberId === member.id && isOpen(r)).length;
  const verdict = canReserve({
    anyCopyAvailable: anyAvailable,
    alreadyActive: mine.length > 0,
    activeForThisMember: activeForMe,
    memberLimit: rolePol.maxReservations,
    queueLength: openForBook(bookId).length,
    queueLimit: pol.global.queueLimit
  });
  if (!verdict.ok) {
    const msg = {
      BOOK_AVAILABLE: `"${book.title}" has copies on the shelf — no reservation needed`,
      DUPLICATE: 'You already have an open reservation for this title',
      LIMIT: `Reservation limit reached (${rolePol.maxReservations})`,
      QUEUE_FULL: 'The queue for this title is full'
    }[verdict.code];
    throw conflict(verdict.code, msg);
  }
  const reservation = Reservations.insert({
    memberId: member.id, memberName: member.name, bookId, bookTitle: book.title,
    status: 'WAITING', reservedAt: new Date().toISOString()
  });
  audit.record(user, 'RESERVE', 'Reservation', reservation.id, null, { bookTitle: book.title, member: member.memberId });
  return { reservation, position: queue(bookId).findIndex((r) => r.id === reservation.id) + 1 };
}

function mineFor(memberId) {
  return Reservations.find((r) => r.memberId === memberId)
    .map((r) => ({ ...r, position: r.status === 'WAITING' ? (queue(r.bookId).findIndex((q) => q.id === r.id) + 1 || null) : null }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Dispatch the next in-queue member for a book's returned copy. Returns the
 * RESERVED copy + READY reservation, or releases the copy as AVAILABLE.
 */
function dispatchNext(bookId, copyId) {
  const copy = Copies.byId(copyId);
  if (!copy) return null;
  const next = nextWaiting(queue(bookId));
  if (next) {
    Copies.update(copyId, { status: 'RESERVED', heldFor: next.memberId });
    const res = Reservations.update(next.id, { status: 'READY', readyAt: new Date().toISOString(), copyId });
    notify.notify(next.memberId, 'RESERVATION_READY', 'Reservation ready',
      `Your reserved "${copy.title || next.bookTitle || 'book'}" copy is held for 48 hours.`, res.id);
    return { dispatched: { memberId: next.memberId, reservationId: next.id } };
  }
  Copies.update(copyId, { status: 'AVAILABLE', heldFor: null });
  return null;
}

/**
 * Cancel a reservation. RES-001 FIX: capture pre-state snapshots BEFORE any
 * mutation, and when the cancelled reservation was READY, re-dispatch the
 * next queued member (or release the copy) — never leak the held copy back
 * to the shelf silently.
 */
function cancel(actor, id, bySelf = false) {
  const before = audit.snapshotOf(Reservations, id);
  if (!before) throw notFound('Reservation not found');
  if (!isOpen(before)) throw badRequest('Reservation is already closed');
  if (bySelf && actor.sub && before.memberId !== actor.sub) {
    throw conflict('NOT_OWNER', 'A member may only cancel their own reservation');
  }
  const updated = Reservations.update(id, { status: 'CANCELLED', cancelledAt: new Date().toISOString() });
  let effect = null;
  if (before.status === 'READY') {
    const heldCopy = Copies.findOne((c) => c.bookId === before.bookId && c.status === 'RESERVED' && c.heldFor === before.memberId);
    if (heldCopy) effect = dispatchNext(before.bookId, heldCopy.id);
  }
  audit.record(actor, 'RESERVATION_CANCEL', 'Reservation', id, before, { status: 'CANCELLED', redispatched: effect ? effect.dispatched || 'released' : null });
  return { cancelled: updated, effect };
}

/** READY holds older than holdDays expire and the copy moves to the next member. */
function expireReadyHolds() {
  const hours = policies().global.holdDays;
  const cutoff = Date.now() - hours * 3600 * 1000;
  const expired = [];
  for (const r of Reservations.find((x) => x.status === 'READY')) {
    const readyAt = new Date(r.readyAt || r.updatedAt).getTime();
    if (readyAt < cutoff) {
      const updated = Reservations.update(r.id, { status: 'EXPIRED' });
      expired.push(updated);
      const held = Copies.findOne((c) => c.status === 'RESERVED' && c.heldFor === r.memberId && c.bookId === r.bookId);
      if (held) dispatchNext(r.bookId, held.id);
    }
  }
  return expired;
}

module.exports = { reserve, mineFor, cancel, dispatchNext, expireReadyHolds, queue };
