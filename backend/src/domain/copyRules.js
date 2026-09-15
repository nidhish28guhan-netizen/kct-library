'use strict';
/** Copy status machine: which copy states may be issued / returned / adjusted. */
const COPY_STATUSES = ['AVAILABLE', 'ISSUED', 'RESERVED', 'LOST', 'DAMAGED', 'MAINTENANCE'];
const ISSUABLE = ['AVAILABLE', 'RESERVED']; // RESERVED allowed only when holder == borrower

function canIssueCopy(copy, memberId) {
  if (!copy) return { ok: false, code: 'COPY_NOT_FOUND' };
  if (copy.status === 'AVAILABLE') return { ok: true };
  if (copy.status === 'RESERVED' && copy.heldFor === memberId) return { ok: true };
  return { ok: false, code: 'COPY_NOT_AVAILABLE' };
}

function canBeReturned(copy) { return copy && copy.status === 'ISSUED'; }

module.exports = { COPY_STATUSES, ISSUABLE, canIssueCopy, canBeReturned };
