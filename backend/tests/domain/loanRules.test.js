'use strict';
const { computeDueDate, isOverdue, daysLate, canIssue, canRenew, daysUntil } = require('../../src/domain/loanRules');

const iso = (ms) => new Date(ms).toISOString();
const D = 864e5;

describe('loanRules.computeDueDate', () => {
  test('14-day student loan lands exactly 14 days later at day-end', () => {
    const due = computeDueDate('2026-07-01T10:00:00Z', 14);
    expect(due.slice(0, 10)).toBe('2026-07-15');
    expect(due.slice(11, 19)).toBe('23:59:59');
  });
  test('30-day faculty period', () => {
    expect(computeDueDate('2026-07-01T00:00:00Z', 30).slice(0, 10)).toBe('2026-07-31');
  });
  test('loan period of 1 day (BVA min)', () => {
    expect(computeDueDate('2026-07-01T00:00:00Z', 1).slice(0, 10)).toBe('2026-07-02');
  });
});

describe('loanRules.isOverdue', () => {
  test('returned loan is never overdue', () => {
    expect(isOverdue({ dueDate: iso(Date.now() - 10 * D), returnDate: iso(Date.now()) })).toBe(false);
  });
  test('active loan past due is overdue (BVA: +1 second past)', () => {
    expect(isOverdue({ dueDate: iso(Date.now() - 1000), returnDate: null }, new Date())).toBe(true);
  });
  test('active loan 1 second before due is not overdue (BVA boundary)', () => {
    expect(isOverdue({ dueDate: iso(Date.now() + 1000), returnDate: null }, new Date())).toBe(false);
  });
});

describe('loanRules.daysLate — boundary value analysis around due day', () => {
  test('EP on-time: returns on due date = 0 late days', () => {
    expect(daysLate('2026-07-15T09:00:00Z', '2026-07-15T23:59:59Z')).toBe(0);
  });
  test('EP on-time: early return = 0', () => {
    expect(daysLate('2026-07-10T00:00:00Z', '2026-07-15T23:59:59Z')).toBe(0);
  });
  test('BVA: one day past due = 1 late day', () => {
    expect(daysLate('2026-07-16T00:00:01Z', '2026-07-15T23:59:59Z')).toBe(1);
  });
  test('late by 4 days (blueprint example)', () => {
    expect(daysLate('2026-07-19T12:00:00Z', '2026-07-15T23:59:59Z')).toBe(4);
  });
});

describe('loanRules.canIssue — decision table', () => {
  const base = { member: { status: 'ACTIVE' }, activeCount: 1, limit: 3, unpaidDues: 0, blockThreshold: 50 };
  test('T1 all good -> ok', () => expect(canIssue(base)).toEqual({ ok: true, reasons: [] }));
  test('T2 inactive member blocked', () => {
    const v = canIssue({ ...base, member: { status: 'SUSPENDED' } });
    expect(v.ok).toBe(false); expect(v.reasons).toContain('MEMBER_INACTIVE');
  });
  test('T3 borrow limit reached blocked (BVA: count == limit)', () => {
    const v = canIssue({ ...base, activeCount: 3 });
    expect(v.reasons).toContain('BORROW_LIMIT');
  });
  test('T3b one below limit allowed (BVA: limit-1)', () => {
    expect(canIssue({ ...base, activeCount: 2 }).ok).toBe(true);
  });
  test('T4 fine block at threshold exactly (BVA: dues == threshold)', () => {
    const v = canIssue({ ...base, unpaidDues: 50 });
    expect(v.reasons).toContain('FINE_BLOCK');
  });
  test('T5 multiple failures report every reason', () => {
    const v = canIssue({ member: { status: 'BLACKLISTED' }, activeCount: 9, limit: 3, unpaidDues: 120, blockThreshold: 50 });
    expect(v.reasons.sort()).toEqual(['BORROW_LIMIT', 'FINE_BLOCK', 'MEMBER_INACTIVE']);
  });
});

describe('loanRules.canRenew', () => {
  test('renewal allowed within limits and nobody waiting', () => {
    expect(canRenew({ renewalsUsed: 0, renewLimit: 2, overdue: false, queueWaiting: false }).ok).toBe(true);
  });
  test('renew limit BVA: used == limit blocked with RENEW_LIMIT', () => {
    expect(canRenew({ renewalsUsed: 2, renewLimit: 2, overdue: false, queueWaiting: false }).reasons).toContain('RENEW_LIMIT');
  });
  test('overdue loans cannot renew', () => {
    expect(canRenew({ renewalsUsed: 0, renewLimit: 2, overdue: true, queueWaiting: false }).reasons).toContain('RENEW_OVERDUE');
  });
  test('pending reservation queue blocks renewal', () => {
    expect(canRenew({ renewalsUsed: 0, renewLimit: 2, overdue: false, queueWaiting: true }).reasons).toContain('RENEW_RESERVED');
  });
});

describe('loanRules.daysUntil', () => {
  test('due tomorrow rounds up to 1', () => {
    expect(daysUntil({ dueDate: iso(Date.now() + 1.5 * D) })).toBe(2);
  });
});
