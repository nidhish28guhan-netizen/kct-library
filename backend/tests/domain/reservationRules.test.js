'use strict';
const { orderQueue, canReserve, positionOf, nextWaiting, isOpen } = require('../../src/domain/reservationRules');

const r = (id, role, createdAt, memberId = id, status = 'WAITING') => ({ id, role, createdAt, memberId, status });

describe('reservationRules.orderQueue — FACULTY first, then FIFO, then memberId', () => {
  test('faculty overtakes an earlier-queued student', () => {
    const q = orderQueue([r('RS-1', 'STUDENT', '2026-08-01T10:00:00Z'), r('RS-2', 'FACULTY', '2026-08-02T10:00:00Z')]);
    expect(q.map((x) => x.id)).toEqual(['RS-2', 'RS-1']);
  });
  test('same role keeps FIFO order', () => {
    const q = orderQueue([r('B', 'STUDENT', '2026-08-02T00:00:00Z'), r('A', 'STUDENT', '2026-08-01T00:00:00Z')]);
    expect(q.map((x) => x.id)).toEqual(['A', 'B']);
  });
  test('identical timestamps break ties deterministically by memberId', () => {
    const same = '2026-08-01T00:00:00Z';
    const q = orderQueue([r('x', 'STUDENT', same, 'CSE2202'), r('y', 'STUDENT', same, 'CSE2201')]);
    expect(q.map((x) => x.id)).toEqual(['y', 'x']);
  });
});

describe('reservationRules.canReserve — guard decision table', () => {
  const ok = { anyCopyAvailable: false, alreadyActive: false, activeForThisMember: 0, memberLimit: 3, queueLength: 1, queueLimit: 5 };
  test('valid reservation gets next position', () => expect(canReserve(ok)).toEqual({ ok: true, position: 2 }));
  test('BOOK_AVAILABLE when a copy is on the shelf', () => {
    expect(canReserve({ ...ok, anyCopyAvailable: true }).code).toBe('BOOK_AVAILABLE');
  });
  test('DUPLICATE when member already queued', () => {
    expect(canReserve({ ...ok, alreadyActive: true }).code).toBe('DUPLICATE');
  });
  test('LIMIT BVA: at member limit (3) rejected, below allowed', () => {
    expect(canReserve({ ...ok, activeForThisMember: 3 }).code).toBe('LIMIT');
    expect(canReserve({ ...ok, activeForThisMember: 2 }).ok).toBe(true);
  });
  test('QUEUE_FULL BVA: queue 5 of 5 rejected, 4 of 5 ok', () => {
    expect(canReserve({ ...ok, queueLength: 5 }).code).toBe('QUEUE_FULL');
    expect(canReserve({ ...ok, queueLength: 4 }).ok).toBe(true);
  });
});

describe('queue helpers', () => {
  test('positionOf returns 1-based position', () => {
    const q = orderQueue([r('A', 'FACULTY', '2026-08-01Z'), r('B', 'STUDENT', '2026-08-02Z')]);
    expect(positionOf(q, 'B')).toBe(2);
    expect(positionOf(q, 'ZZ')).toBeNull();
  });
  test('nextWaiting skips READY/CANCELLED entries', () => {
    const q = orderQueue([r('A', 'STUDENT', '2026-08-01Z', 'A', 'READY'), r('B', 'STUDENT', '2026-08-02Z')]);
    expect(nextWaiting(q).id).toBe('B');
  });
  test('isOpen covers WAITING and READY only', () => {
    expect(isOpen(r('a', 'STUDENT', 'x', 'a', 'WAITING'))).toBe(true);
    expect(isOpen(r('a', 'STUDENT', 'x', 'a', 'READY'))).toBe(true);
    expect(isOpen(r('a', 'STUDENT', 'x', 'a', 'CANCELLED'))).toBe(false);
    expect(isOpen(r('a', 'STUDENT', 'x', 'a', 'COMPLETED'))).toBe(false);
    expect(isOpen(r('a', 'STUDENT', 'x', 'a', 'EXPIRED'))).toBe(false);
  });
});
