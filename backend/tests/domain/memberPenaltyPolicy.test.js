'use strict';
const { calculatePenalty, blocksBorrowing, formatINR } = require('../../src/domain/penaltyRules');
const { validateMemberInput, normalizeIdentifier, canTransition, isActiveMember, selfOrStaff } = require('../../src/domain/memberRules');
const { mergePolicies, policyFor, DEFAULT_POLICIES } = require('../../src/domain/policyRules');

describe('penaltyRules.calculatePenalty', () => {
  test('BVA: on time (0 days) costs nothing', () => expect(calculatePenalty(0, 1)).toBe(0));
  test('BVA: negative late days never produce negative fine', () => expect(calculatePenalty(-3, 1)).toBe(0));
  test('BVA: first late day charges one day', () => expect(calculatePenalty(1, 1)).toBe(1));
  test('linear scaling: 4 days at ₹1.5/day = ₹6', () => expect(calculatePenalty(4, 1.5)).toBe(6));
  test('rounds to paise (2dp)', () => expect(calculatePenalty(3, 0.33)).toBe(0.99));
});

describe('penaltyRules.blocksBorrowing + formatINR', () => {
  test('BVA: below threshold not blocked', () => expect(blocksBorrowing(49.99, 50)).toBe(false));
  test('BVA: exactly at threshold blocks', () => expect(blocksBorrowing(50, 50)).toBe(true));
  test('formats currency', () => expect(formatINR(7)).toBe('₹7.00'));
});

describe('memberRules validation', () => {
  test('normalizeIdentifier trims + lowercases', () => expect(normalizeIdentifier(' CSE2201 ')).toBe('cse2201'));
  test('valid member passes', () => {
    expect(validateMemberInput({ name: 'Arun', role: 'STUDENT', memberId: 'CSE2201', email: 'a@b.co' })).toEqual([]);
  });
  test('missing name, bad role, bad roll, bad email all reported', () => {
    const errs = validateMemberInput({ name: ' ', role: 'GUEST', memberId: 'x!!', email: 'nope' });
    expect(errs.length).toBe(4);
  });
  test('status transitions follow the matrix', () => {
    expect(canTransition('ACTIVE', 'SUSPENDED')).toBe(true);
    expect(canTransition('ACTIVE', 'ACTIVE')).toBe(false);
    expect(canTransition('BLACKLISTED', 'ACTIVE')).toBe(true);
  });
  test('only ACTIVE members are eligible', () => {
    expect(isActiveMember({ status: 'ACTIVE' })).toBe(true);
    expect(isActiveMember({ status: 'SUSPENDED' })).toBe(false);
    expect(isActiveMember(null)).toBeFalsy();
  });
  test('selfOrStaff: staff pass, own id passes, others refused', () => {
    expect(selfOrStaff({ role: 'LIBRARIAN' }, 'any')).toBe(true);
    expect(selfOrStaff({ role: 'STUDENT', memberId: 'MB-1' }, 'MB-1')).toBe(true);
    expect(selfOrStaff({ role: 'STUDENT', memberId: 'MB-1' }, 'MB-2')).toBe(false);
  });
});

describe('policyRules', () => {
  test('defaults sane: student 14d/3 books, faculty 30d/5 books', () => {
    expect(DEFAULT_POLICIES.roles.STUDENT.loanDays).toBe(14);
    expect(DEFAULT_POLICIES.roles.FACULTY.maxBooks).toBe(5);
  });
  test('merge accepts known numeric fields', () => {
    const p = mergePolicies(null, { roles: { STUDENT: { loanDays: 21 } }, global: { finePerDay: 2 } });
    expect(p.roles.STUDENT.loanDays).toBe(21);
    expect(p.global.finePerDay).toBe(2);
    expect(p.roles.STUDENT.maxBooks).toBe(3); // untouched
  });
  test('merge ignores unknown keys, zero, negative, string values', () => {
    const p = mergePolicies(null, { roles: { STUDENT: { evil: 1, loanDays: 0, maxBooks: -4 } }, global: { finePerDay: 'free' } });
    expect(p.roles.STUDENT.evil).toBeUndefined();
    expect(p.roles.STUDENT.loanDays).toBe(14);
    expect(p.global.finePerDay).toBe(1);
  });
  test('policyFor flattens role + global; unknown role falls back to student', () => {
    const pol = policyFor(DEFAULT_POLICIES, 'FACULTY');
    expect(pol).toMatchObject({ loanDays: 30, maxBooks: 5, finePerDay: 1, renewLimit: 2 });
    expect(policyFor(DEFAULT_POLICIES, 'GHOST').loanDays).toBe(14);
  });
});
