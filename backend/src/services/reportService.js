'use strict';
const { Books, Copies, Members, Loans, Reservations, Penalties } = require('../repositories');
const { isOverdue } = require('../domain/loanRules');
const { isOpen } = require('../domain/reservationRules');

const day = (d) => new Date(d).toISOString().slice(0, 10);

function summary() {
  const loans = Loans.all();
  const now = new Date();
  const weekAgo = new Date(now - 7 * 864e5).toISOString();
  const active = loans.filter((l) => !l.returnDate);
  return {
    books: Books.count(),
    copies: Copies.count(),
    available: Copies.find((c) => c.status === 'AVAILABLE').length,
    issued: Copies.find((c) => c.status === 'ISSUED').length,
    reserved: Copies.find((c) => c.status === 'RESERVED').length,
    overdue: active.filter((l) => isOverdue(l, now)).length,
    members: Members.count(),
    activeLoans: active.length,
    unpaidDues: Number(Penalties.find((p) => p.status === 'UNPAID').reduce((s, p) => s + p.amount, 0).toFixed(2)),
    issuesThisWeek: loans.filter((l) => l.issueDate >= weekAgo).length,
    returnsThisWeek: loans.filter((l) => l.returnDate && l.returnDate >= weekAgo).length,
    reservationsActive: Reservations.find(isOpen).length
  };
}

function overdueReport() {
  return Loans.find((l) => !l.returnDate && isOverdue(l))
    .map((l) => ({
      loanId: l.id, memberId: l.memberId, memberName: l.memberName, memberCode: l.memberCode,
      bookTitle: l.bookTitle, barcode: l.barcode, dueDate: l.dueDate,
      daysLate: Math.max(1, Math.floor((Date.now() - new Date(l.dueDate)) / 864e5))
    }))
    .sort((a, b) => b.daysLate - a.daysLate);
}

function circulationTrend(days = 14) {
  const out = [];
  const loans = Loans.all();
  for (let i = days - 1; i >= 0; i--) {
    const d = day(new Date(Date.now() - i * 864e5));
    out.push({
      date: d,
      issued: loans.filter((l) => day(l.issueDate) === d).length,
      returned: loans.filter((l) => l.returnDate && day(l.returnDate) === d).length
    });
  }
  return out;
}

function popularBooks(limit = 10) {
  const counts = {};
  for (const l of Loans.all()) counts[l.bookId] = (counts[l.bookId] || 0) + 1;
  return Object.entries(counts)
    .map(([bookId, times]) => {
      const b = Books.byId(bookId);
      return b ? { bookTitle: b.title, author: b.author, times } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.times - a.times)
    .slice(0, limit);
}

function mostReserved(limit = 10) {
  const counts = {};
  for (const r of Reservations.all()) counts[r.bookId] = (counts[r.bookId] || 0) + 1;
  return Object.entries(counts)
    .map(([bookId, times]) => {
      const b = Books.byId(bookId);
      return b ? { bookTitle: b.title, times } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.times - a.times)
    .slice(0, limit);
}

module.exports = { summary, overdueReport, circulationTrend, popularBooks, mostReserved };
