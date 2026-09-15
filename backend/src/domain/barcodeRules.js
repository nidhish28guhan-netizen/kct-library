'use strict';
/*
 * Barcode architecture (blueprint §6): the physical copy barcode is derived
 * from the Book Code + zero-padded copy number, e.g. LIB-CSDB101-001.
 * Uniqueness is validated by the application and enforced again on save.
 */
function copyBarcode(bookCode, copyNumber) {
  return `LIB-${String(bookCode).toUpperCase()}-${String(copyNumber).padStart(3, '0')}`;
}
function memberBarcode(memberId) {
  return `LIB-${String(memberId).toUpperCase()}`;
}
function parseCopyBarcode(bc) {
  const m = /^LIB-([A-Z0-9]+)-(\d{3})$/.exec(String(bc || '').toUpperCase().trim());
  return m ? { bookCode: m[1], copyNumber: Number(m[2]) } : null;
}
module.exports = { copyBarcode, memberBarcode, parseCopyBarcode };
