'use strict';
/*
 * Deterministic rule-based recommender (blueprint §11 — explicitly NOT AI).
 * Weighted score (weights fixed by blueprint):
 *   0.40 category + 0.25 subject + 0.15 author + 0.10 language + 0.10 popularity
 * Profile = weighted preference vectors derived from the member's loans and
 * reservations; popularity = issue counts across the college.
 */
const WEIGHTS = { category: 0.40, subject: 0.25, author: 0.15, language: 0.10, popularity: 0.10 };
const LOAN_WEIGHT = 1, RESERVATION_WEIGHT = 0.6;

function buildProfile({ loans, reservations, booksById }) {
  const profile = { category: {}, subject: {}, author: {}, language: {}, seen: {} };
  const add = (book, w) => {
    if (!book) return;
    profile.seen[book.id] = (profile.seen[book.id] || 0) + w;
    for (const key of ['category', 'subject', 'author', 'language']) {
      const v = book[key];
      if (v) profile[key][v] = (profile[key][v] || 0) + w;
    }
  };
  for (const l of loans) add(booksById(l.bookId), LOAN_WEIGHT);
  for (const r of reservations) add(booksById(r.bookId), RESERVATION_WEIGHT);
  return profile;
}

function maxOf(map) { return Object.values(map).length ? Math.max(...Object.values(map)) : 1; }
function norm(map, key, max) { return max > 0 ? (map[key] || 0) / max : 0; }

function scoreBook(book, profile, popularityMap) {
  const parts = {
    category: norm(profile.category, book.category, maxOf(profile.category)),
    subject: norm(profile.subject, book.subject, maxOf(profile.subject)),
    author: norm(profile.author, book.author, maxOf(profile.author)),
    language: norm(profile.language, book.language, maxOf(profile.language)),
    popularity: popularityMap[book.id] || 0
  };
  let score = 0;
  for (const k of Object.keys(WEIGHTS)) score += WEIGHTS[k] * parts[k];
  const reasons = [];
  if (parts.category >= 0.5) reasons.push(`matches your interest in ${book.category}`);
  if (parts.subject >= 0.5) reasons.push(`covers ${book.subject}, a subject you borrow often`);
  if (parts.author >= 0.5) reasons.push(`by ${book.author}, an author you read`);
  if (parts.language >= 0.5 && Object.keys(profile.language).length > 1) reasons.push(`in ${book.language}`);
  if (parts.popularity >= 0.5) reasons.push('popular across the college');
  return { score: Number(score.toFixed(3)), parts, reasons };
}

/** Rank candidates; excludes books the member already has on loan/in queue. */
function rank(candidates, profile, popularityMap, excludeBookIds) {
  const out = [];
  for (const book of candidates) {
    if (excludeBookIds.has(book.id)) continue;
    if (profile.seen[book.id]) continue; // never suggest what was already borrowed
    const { score, reasons } = scoreBook(book, profile, popularityMap);
    if (score > 0 && reasons.length) out.push({ bookId: book.id, score, reasons });
  }
  return out.sort((a, b) => b.score - a.score || a.bookId.localeCompare(b.bookId));
}

module.exports = { WEIGHTS, buildProfile, scoreBook, rank };
