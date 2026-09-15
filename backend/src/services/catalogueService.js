'use strict';
const { Books, Copies } = require('../repositories');
const { badRequest, notFound } = require('../utils/errors');
const audit = require('./auditService');

const BOOK_FIELDS = ['bookCode', 'isbn', 'title', 'author', 'publisher', 'edition', 'category', 'subject', 'language', 'keywords', 'publicationYear', 'description'];
const open = (pred) => ['AVAILABLE', 'RESERVED'].includes(pred); // RESERVED copies still show as "on shelf" for someone else? No: available only

function withCounts(book) {
  const copies = Copies.find((c) => c.bookId === book.id);
  return {
    ...book,
    totalCopies: copies.length,
    availableCopies: copies.filter((c) => c.status === 'AVAILABLE').length
  };
}

function search({ q = '', category = '', author = '', language = '', page = 1, limit = 10 } = {}) {
  const needle = q.trim().toLowerCase();
  let rows = Books.all();
  if (needle) {
    rows = rows.filter((b) => [b.title, b.author, b.isbn, b.bookCode, b.subject, b.keywords]
      .some((v) => String(v || '').toLowerCase().includes(needle)));
  }
  if (category) rows = rows.filter((b) => b.category === category);
  if (author) rows = rows.filter((b) => b.author.toLowerCase().includes(author.toLowerCase()));
  if (language) rows = rows.filter((b) => b.language === language);
  const total = rows.length;
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(50, Math.max(1, Number(limit) || 10));
  return { total, page: p, limit: l, results: rows.slice((p - 1) * l, p * l).map(withCounts) };
}

function categories() {
  return [...new Set(Books.all().map((b) => b.category).filter(Boolean))].sort();
}

function detail(id) {
  const book = Books.byId(id);
  if (!book) throw notFound('Book not found');
  return { book: withCounts(book), copies: Copies.find((c) => c.bookId === id) };
}

function create(actor, input) {
  if (!input.title || !input.author || !input.bookCode) throw badRequest('bookCode, title and author are required');
  if (Books.findOne((b) => b.bookCode.toUpperCase() === String(input.bookCode).toUpperCase())) {
    throw badRequest('Book Code already exists');
  }
  const data = {};
  for (const f of BOOK_FIELDS) if (input[f] !== undefined) data[f] = input[f];
  data.language = data.language || 'English';
  const book = Books.insert(data);
  audit.record(actor, 'BOOK_CREATE', 'Book', book.id, null, book);
  return withCounts(book);
}

function update(actor, id, patch) {
  const before = audit.snapshotOf(Books, id);
  if (!before) throw notFound('Book not found');
  const clean = {};
  for (const f of BOOK_FIELDS) if (patch[f] !== undefined && f !== 'bookCode') clean[f] = patch[f];
  const book = Books.update(id, clean);
  audit.record(actor, 'BOOK_UPDATE', 'Book', id, before, book);
  return withCounts(book);
}

function remove(actor, id) {
  const book = Books.byId(id);
  if (!book) throw notFound('Book not found');
  const activeCopies = Copies.find((c) => c.bookId === id && c.status === 'ISSUED');
  if (activeCopies.length) throw badRequest('Cannot delete a title with issued copies');
  Copies.find((c) => c.bookId === id).forEach((c) => Copies.remove(c.id));
  Books.remove(id);
  audit.record(actor, 'BOOK_DELETE', 'Book', id, book, null);
  return { ok: true };
}

module.exports = { search, detail, create, update, remove, withCounts, categories };
