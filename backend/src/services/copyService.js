'use strict';
const bwipjs = require('bwip-js');
const { Copies, Books } = require('../repositories');
const { copyBarcode } = require('../domain/barcodeRules');
const { COPY_STATUSES } = require('../domain/copyRules');
const { badRequest, notFound } = require('../utils/errors');
const audit = require('./auditService');

/** Register N physical copies for a book; barcodes auto-derived (LIB-<code>-<NNN>). */
function addCopies(actor, bookId, { count = 1, shelfLocation = null, condition = 'GOOD' } = {}) {
  const book = Books.byId(bookId);
  if (!book) throw notFound('Book not found');
  const n = Math.min(50, Math.max(1, Number(count) || 1));
  const existing = Copies.find((c) => c.bookId === bookId);
  let next = existing.reduce((m, c) => Math.max(m, c.copyNumber), 0) + 1;
  const created = [];
  for (let i = 0; i < n; i++) {
    const barcode = copyBarcode(book.bookCode, next + i);
    if (Copies.findOne((c) => c.barcode === barcode)) throw badRequest(`Barcode collision on ${barcode}`);
    created.push(Copies.insert({
      bookId, bookCode: book.bookCode, copyNumber: next + i, barcode,
      shelfLocation, condition, status: 'AVAILABLE', heldFor: null,
      acquiredAt: new Date().toISOString().slice(0, 10)
    }));
    audit.record(actor, 'COPY_CREATE', 'Copy', created[created.length - 1].id, null, created[created.length - 1]);
  }
  return created;
}

function byBarcode(barcode) {
  return Copies.findOne((c) => c.barcode === String(barcode || '').toUpperCase().trim()) || null;
}

function locate(barcode) {
  const copy = byBarcode(barcode);
  if (!copy) throw notFound('Unknown barcode');
  return { copy, book: Books.byId(copy.bookId) };
}

function updateCopy(actor, id, patch) {
  const before = audit.snapshotOf(Copies, id);
  if (!before) throw notFound('Copy not found');
  const clean = {};
  for (const f of ['shelfLocation', 'condition']) if (patch[f] !== undefined) clean[f] = patch[f];
  if (patch.status !== undefined) {
    if (!COPY_STATUSES.includes(patch.status)) throw badRequest('Invalid copy status');
    if (['ISSUED', 'RESERVED'].includes(patch.status)) throw badRequest('Use circulation to change ISSUED/RESERVED');
    clean.status = patch.status;
    if (!['AVAILABLE'].includes(patch.status)) clean.heldFor = null;
  }
  const copy = Copies.update(id, clean);
  audit.record(actor, 'COPY_UPDATE', 'Copy', id, before, copy);
  return copy;
}

/** Code 128 SVG via bwip-js (pure JS — no external service). */
function svgFor(barcode) {
  return bwipjs.toSVG({
    bcid: 'code128', text: String(barcode).toUpperCase(),
    scale: 2, height: 11, textsize: 9,
    background: '#FFFFFF', color: '#16302B', padding: 3
  });
}

module.exports = { addCopies, byBarcode, locate, updateCopy, svgFor };
