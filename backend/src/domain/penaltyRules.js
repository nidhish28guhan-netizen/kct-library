'use strict';
/** Library penalty rule (not a payments module): fine = lateDays * finePerDay. */
function calculatePenalty(daysLate, finePerDay) {
  if (daysLate <= 0) return 0;
  return Number((daysLate * finePerDay).toFixed(2));
}

/** Unpaid dues at/above the block threshold stop borrowing. */
function blocksBorrowing(unpaidDues, blockThreshold) {
  return unpaidDues >= blockThreshold;
}

function formatINR(amount) {
  return `₹${Number(amount).toFixed(2)}`;
}

module.exports = { calculatePenalty, blocksBorrowing, formatINR };
