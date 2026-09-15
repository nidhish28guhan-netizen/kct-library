'use strict';
const { Books, Loans, Reservations, Copies } = require('../repositories');
const { buildProfile, rank } = require('../domain/recommendationRules');
const { isOpen } = require('../domain/reservationRules');

/** College-wide popularity: normalized issue counts per book. */
function popularityMap() {
  const counts = {};
  for (const l of Loans.all()) counts[l.bookId] = (counts[l.bookId] || 0) + 1;
  const max = Math.max(1, ...Object.values(counts));
  return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / max]));
}

function forMe(memberId, limit = 8) {
  const booksById = (id) => Books.byId(id);
  const loans = Loans.find((l) => l.memberId === memberId);
  const reservations = Reservations.find((r) => r.memberId === memberId);
  const profile = buildProfile({
    loans: loans.map((l) => ({ bookId: l.bookId })),
    reservations: reservations.map((r) => ({ bookId: r.bookId })),
    booksById
  });
  const exclude = new Set([
    ...loans.filter((l) => !l.returnDate).map((l) => l.bookId),
    ...reservations.filter(isOpen).map((r) => r.bookId)
  ]);
  const candidates = Books.all().filter((b) =>
    Copies.find((c) => c.bookId === b.id).some((c) => c.status === 'AVAILABLE'));
  return rank(candidates, profile, popularityMap(), exclude)
    .slice(0, limit)
    .map((r) => ({ ...r, book: Books.byId(r.bookId) }));
}

/** "Readers also borrowed" — co-occurrence, still deterministic query logic. */
function similarTo(bookId, limit = 6) {
  const target = Books.byId(bookId);
  if (!target) return [];
  const coCounts = {};
  for (const loan of Loans.find((l) => l.bookId === bookId)) {
    for (const other of Loans.find((l) => l.memberId === loan.memberId && l.bookId !== bookId)) {
      coCounts[other.bookId] = (coCounts[other.bookId] || 0) + 1;
    }
  }
  const sameShelf = Books.all().filter((b) => b.id !== bookId && (b.subject === target.subject || b.author === target.author));
  const scored = new Map();
  for (const [id, n] of Object.entries(coCounts)) scored.set(id, (scored.get(id) || 0) + n * 2);
  for (const b of sameShelf) scored.set(b.id, (scored.get(b.id) || 0) + 1.5);
  return [...scored.entries()]
    .map(([id, s]) => ({ book: Books.byId(id), score: s }))
    .filter((x) => x.book && Copies.find((c) => c.bookId === x.book.id).some((c) => c.status === 'AVAILABLE'))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { forMe, similarTo };
