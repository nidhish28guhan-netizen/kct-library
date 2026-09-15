'use strict';
const { buildProfile, scoreBook, rank, WEIGHTS } = require('../../src/domain/recommendationRules');
const { copyBarcode, memberBarcode, parseCopyBarcode } = require('../../src/domain/barcodeRules');
const { canIssueCopy, COPY_STATUSES } = require('../../src/domain/copyRules');

const book = (id, over = {}) => ({
  id, category: 'Computer Science', subject: 'Algorithms', author: 'Cormen', language: 'English', ...over
});

describe('barcodeRules (blueprint §6)', () => {
  test('copy barcode = LIB-<BookCode>-<NNN> with zero padding', () => {
    expect(copyBarcode('csdb101', 1)).toBe('LIB-CSDB101-001');
    expect(copyBarcode('SE204', 12)).toBe('LIB-SE204-012');
  });
  test('member barcode derived from roll number', () => expect(memberBarcode('cse2201')).toBe('LIB-CSE2201'));
  test('parse round-trips', () => {
    expect(parseCopyBarcode('LIB-CSDB101-002')).toEqual({ bookCode: 'CSDB101', copyNumber: 2 });
    expect(parseCopyBarcode('garbage')).toBeNull();
  });
});

describe('copyRules', () => {
  test('available copy issuable to anyone', () => {
    expect(canIssueCopy({ status: 'AVAILABLE' }, 'MB-1').ok).toBe(true);
  });
  test('RESERVED copy issuable only to its holder (collect-your-hold)', () => {
    expect(canIssueCopy({ status: 'RESERVED', heldFor: 'MB-1' }, 'MB-1').ok).toBe(true);
    expect(canIssueCopy({ status: 'RESERVED', heldFor: 'MB-1' }, 'MB-2').ok).toBe(false);
  });
  test('ISSUED / LOST / DAMAGED / MAINTENANCE never issuable', () => {
    for (const st of ['ISSUED', 'LOST', 'DAMAGED', 'MAINTENANCE']) {
      expect(canIssueCopy({ status: st }, 'MB-1').code).toBe('COPY_NOT_AVAILABLE');
    }
    expect(COPY_STATUSES).toContain('RESERVED');
  });
});

describe('recommendationRules (blueprint §11 weights)', () => {
  test('weights match the blueprint and sum to 1', () => {
    expect(WEIGHTS).toEqual({ category: 0.4, subject: 0.25, author: 0.15, language: 0.1, popularity: 0.1 });
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  const booksById = (id) => (id === 'BK-1' ? book('BK-1') : null);
  const profile = buildProfile({ loans: [{ bookId: 'BK-1' }], reservations: [], booksById });

  test('profile aggregates borrowed book facets', () => {
    expect(profile.category['Computer Science']).toBe(1);
    expect(profile.seen['BK-1']).toBe(1);
  });
  test('perfect match scores 1.0 with explanation reasons', () => {
    const s = scoreBook(book('BK-9', {}), profile, { 'BK-9': 1 });
    expect(s.score).toBeCloseTo(1);
    expect(s.reasons.join(' ')).toMatch(/interest in Computer Science/);
  });
  test('language-only match earns exactly its 0.10 weight', () => {
    const p2 = buildProfile({ loans: [], reservations: [], booksById });
    p2.language = { English: 5 }; // member borrows English books only
    const s = scoreBook(book('x', { category: 'Literature', subject: 'Fiction', author: 'Austen', language: 'English' }), p2, {});
    expect(s.score).toBeCloseTo(0.1, 1);
  });
  test('rank: unseen candidates only, sorted, zero-score and no-reason dropped', () => {
    const seenBook = book('BK-1');
    const unseenHigh = book('BK-2');
    const unseenLow = book('BK-3', { category: 'Literature', subject: 'Fiction', author: 'X', language: 'Tamil' });
    const out = rank([seenBook, unseenHigh, unseenLow], profile, {}, new Set());
    expect(out.map((x) => x.bookId)).toEqual(['BK-2']);
    const excluded = rank([unseenHigh], profile, {}, new Set(['BK-2']));
    expect(excluded).toEqual([]);
  });
});
