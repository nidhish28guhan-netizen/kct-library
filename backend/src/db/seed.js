'use strict';
/*
 * Seed the initial dataset: institutional accounts, policy defaults, a real
 * book catalogue with physical copies (auto barcodes), plus representative
 * circulation state (active, returned, overdue loans and a reservation queue)
 * so every screen and report has genuine data to work with.
 */
const { JsonStore, setStore } = require('./store');
const config = require('../config');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Users, Members, Books, Copies, Loans, Reservations, Penalties, Policies, Notifications, Audit } = require('../repositories');
const { DEFAULT_POLICIES } = require('../domain/policyRules');
const { copyBarcode } = require('../domain/barcodeRules');
const { computeDueDate } = require('../domain/loanRules');
const bcrypt = require('bcryptjs');

const store = new JsonStore(config.dataDir);
setStore(store);
store.resetAll();
Policies.set(structuredClone(DEFAULT_POLICIES));

const hash = (pw) => bcrypt.hashSync(pw, 10);
const DAY = 864e5;
const ago = (d) => new Date(Date.now() - d * DAY).toISOString();

/* ---- staff accounts (passwords generated once, printed below; never hardcoded) ---- */
const generated = {};
const staff = [
  { username: 'admin', name: 'Library Administrator', role: 'ADMIN' },
  { username: 'librarian1', name: 'Chief Librarian', role: 'LIBRARIAN' }
];
for (const s of staff) {
  const pw = crypto.randomUUID().slice(0, 8);
  generated[s.username] = pw;
  Users.insert({ username: s.username, name: s.name, role: s.role, passwordHash: hash(pw) });
}

/* ---- members (temporary passwords generated per member, printed once) ---- */
const members = [
  { memberId: 'CSE2201', name: 'Arun Karthik R', role: 'STUDENT', dept: 'CSE', year: 'III', email: 'arun.k@college.edu' },
  { memberId: 'CSE2202', name: 'Deepa Sri L', role: 'STUDENT', dept: 'CSE', year: 'III', email: 'deepa.sri@college.edu' },
  { memberId: 'ECE2210', name: 'Vignesh K', role: 'STUDENT', dept: 'ECE', year: 'II', email: 'vignesh.k@college.edu' },
  { memberId: 'FAC1001', name: 'Dr. Meena Krishnan', role: 'FACULTY', dept: 'CSE', year: null, email: 'meena.k@college.edu' }
];
const memberBy = {};
for (const m of members) {
  const pw = crypto.randomUUID().slice(0, 8);
  generated[m.memberId] = pw;
  const rec = Members.insert({
    ...m, memberId: m.memberId, status: 'ACTIVE', barcode: `LIB-${m.memberId}`,
    passwordHash: hash(pw)
  });
  memberBy[m.memberId] = rec;
}

/* ---- catalogue ---- */
const books = [
  { bookCode: 'CSALG01', isbn: '978-0262046305', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', publisher: 'MIT Press', edition: '4th', category: 'Computer Science', subject: 'Algorithms', language: 'English', keywords: 'algorithms sorting graphs dp', publicationYear: 2022, copies: 4 },
  { bookCode: 'CSCLN02', isbn: '978-0132350884', title: 'Clean Code', author: 'Robert C. Martin', publisher: 'Prentice Hall', edition: '1st', category: 'Software Engineering', subject: 'Coding Practices', language: 'English', keywords: 'refactoring code quality solid', publicationYear: 2008, copies: 3 },
  { bookCode: 'CSPPG03', isbn: '978-0201616224', title: 'The Pragmatic Programmer', author: 'Andrew Hunt', publisher: 'Addison-Wesley', edition: '20th Anniversary', category: 'Software Engineering', subject: 'Coding Practices', language: 'English', keywords: 'productivity craftsmanship', publicationYear: 2019, copies: 2 },
  { bookCode: 'CSHFP04', isbn: '978-1491950171', title: 'Head First Design Patterns', author: 'Eric Freeman', publisher: "O'Reilly", edition: '2nd', category: 'Computer Science', subject: 'Design Patterns', language: 'English', keywords: 'patterns oop java', publicationYear: 2020, copies: 3 },
  { bookCode: 'CSOSC05', isbn: '978-1118063884', title: 'Operating System Concepts', author: 'Abraham Silberschatz', publisher: 'Wiley', edition: '10th', category: 'Computer Science', subject: 'Operating Systems', language: 'English', keywords: 'processes threads memory', publicationYear: 2018, copies: 4 },
  { bookCode: 'CSCNW06', isbn: '978-0132126958', title: 'Computer Networks', author: 'Andrew S. Tanenbaum', publisher: 'Pearson', edition: '5th', category: 'Computer Science', subject: 'Networks', language: 'English', keywords: 'tcp ip protocol layers', publicationYear: 2011, copies: 3 },
  { bookCode: 'CSDBS07', isbn: '978-0078028190', title: 'Database System Concepts', author: 'Abraham Silberschatz', publisher: 'McGraw-Hill', edition: '7th', category: 'Computer Science', subject: 'Databases', language: 'English', keywords: 'sql normalization transactions', publicationYear: 2019, copies: 4 },
  { bookCode: 'CSSEN08', isbn: '978-0133943030', title: 'Software Engineering', author: 'Ian Sommerville', publisher: 'Pearson', edition: '10th', category: 'Software Engineering', subject: 'Software Process', language: 'English', keywords: 'agile requirements testing process', publicationYear: 2015, copies: 3 },
  { bookCode: 'CSMAT09', isbn: '978-8126587683', title: 'Discrete Mathematics', author: 'Jeffery Johnsonbaugh', publisher: 'Pearson India', edition: '8th', category: 'Mathematics', subject: 'Discrete Maths', language: 'English', keywords: 'logic combinatorics graph theory', publicationYear: 2017, copies: 2 },
  { bookCode: 'ENG010', isbn: '978-0140449107', title: 'Pride and Prejudice', author: 'Jane Austen', publisher: 'Penguin Classics', edition: 'Reissue', category: 'Literature', subject: 'Fiction', language: 'English', keywords: 'classic novel', publicationYear: 2003, copies: 2 },
  { bookCode: 'TAM011', isbn: '978-9386219771', title: 'Sivagamiyin Saipadam', author: 'Kalki Krishnamurthy', publisher: 'Kalki Publications', edition: '12th', category: 'Literature', subject: 'Historical Fiction', language: 'Tamil', keywords: 'tamil classic chola', publicationYear: 2015, copies: 2 },
  { bookCode: 'CSEET12', isbn: '978-0134032604', title: 'Compilers: Principles, Techniques, and Tools', author: 'Alfred V. Aho', publisher: 'Pearson', edition: '2nd', category: 'Computer Science', subject: 'Compilers', language: 'English', keywords: 'parsing lexing code generation dragon', publicationYear: 2006, copies: 2 }
];
const bookBy = {};
for (const b of books) {
  const { copies, ...data } = b;
  const book = Books.insert({ ...data });
  bookBy[b.bookCode] = book;
  for (let i = 1; i <= copies; i++) {
    Copies.insert({
      bookId: book.id, bookCode: b.bookCode, copyNumber: i, barcode: copyBarcode(b.bookCode, i),
      shelfLocation: `${b.category.slice(0, 3)}-${b.bookCode}`, condition: 'GOOD',
      status: 'AVAILABLE', heldFor: null, acquiredAt: ago(400 + i * 7)
    });
  }
}

/* ---- circulation history (returned) + state (active/overdue) ---- */
function issue(bookCode, copyNo, memberId, daysAgoIssued, loanDays, returnedDaysAgo = null) {
  const book = bookBy[bookCode];
  const copy = Copies.findOne((c) => c.barcode === copyBarcode(bookCode, copyNo));
  const member = memberBy[memberId];
  const issueDate = ago(daysAgoIssued);
  const dueDate = computeDueDate(issueDate, loanDays);
  const loan = Loans.insert({
    memberId: member.id, memberName: member.name, memberCode: member.memberId,
    bookId: book.id, bookTitle: book.title, copyId: copy.id, barcode: copy.barcode,
    issueDate, dueDate,
    returnDate: returnedDaysAgo !== null ? ago(returnedDaysAgo) : null,
    renewalsUsed: 0, status: returnedDaysAgo !== null ? 'RETURNED' : 'ACTIVE', issuedBy: 'Chief Librarian'
  });
  Copies.update(copy.id, { status: returnedDaysAgo !== null ? 'AVAILABLE' : 'ISSUED' });
  return loan;
}

issue('CSDBS07', 1, 'CSE2201', 30, 14, 18);          // returned on time
issue('CSOSC05', 1, 'CSE2202', 28, 14, 15);          // returned on time
issue('ENG010', 1, 'ECE2210', 20, 14, 9);            // returned on time
issue('CSALG01', 1, 'CSE2201', 25, 14, 8);           // returned 3 days late -> penalty below
issue('CSSEN08', 1, 'FAC1001', 40, 30, 8);           // faculty returned on time
const overdueLoan = issue('CSCNW06', 1, 'ECE2210', 21, 14);   // overdue by ~7 days, still out
const activeLoanA = issue('CSHFP04', 1, 'CSE2202', 5, 14);    // active, due soon window
issue('CSCLN02', 1, 'FAC1001', 6, 30);                        // active faculty loan

Penalties.insert({
  memberId: memberBy.CSE2201.id, memberName: memberBy.CSE2201.name, loanId: 'seeded', bookTitle: 'Introduction to Algorithms',
  amount: 3.0, reason: '3 day(s) late on "Introduction to Algorithms"', status: 'PAID',
  issuedAt: ago(8), paidAt: ago(7), receipt: 'RCPT-SEED01', receivedBy: 'Chief Librarian'
});
Penalties.insert({
  memberId: memberBy.ECE2210.id, memberName: memberBy.ECE2210.name, loanId: overdueLoan.id, bookTitle: overdueLoan.bookTitle,
  amount: 7.0, reason: 'Automated sweep: 7 day(s) overdue', status: 'UNPAID', issuedAt: ago(1)
});

/* ---- a full-out title with a reservation queue (all 3 copies out) ---- */
issue('CSCNW06', 2, 'CSE2201', 10, 14);
issue('CSCNW06', 3, 'FAC1001', 12, 30);
Reservations.insert({
  memberId: memberBy.CSE2202.id, memberName: memberBy.CSE2202.name, bookId: bookBy.CSCNW06.id, bookTitle: 'Computer Networks',
  status: 'WAITING', reservedAt: ago(2)
});
Reservations.insert({
  memberId: memberBy.FAC1001.id, memberName: memberBy.FAC1001.name, bookId: bookBy.CSCNW06.id, bookTitle: 'Computer Networks',
  status: 'WAITING', reservedAt: ago(3)
});
// A ready hold on a copy held back from the shelf:
const heldCopy = Copies.findOne((c) => c.barcode === copyBarcode('CSMAT09', 1));
Loans.insert({
  memberId: memberBy.CSE2201.id, memberName: memberBy.CSE2201.name, memberCode: 'CSE2201',
  bookId: bookBy.CSMAT09.id, bookTitle: 'Discrete Mathematics', copyId: heldCopy.id, barcode: heldCopy.barcode,
  issueDate: ago(12), dueDate: computeDueDate(ago(12), 14), returnDate: ago(1), renewalsUsed: 0,
  status: 'RETURNED', lateDays: 0, issuedBy: 'Chief Librarian'
});
Copies.update(heldCopy.id, { status: 'RESERVED', heldFor: memberBy.ECE2210.id });
Reservations.insert({
  memberId: memberBy.ECE2210.id, memberName: memberBy.ECE2210.name, bookId: bookBy.CSMAT09.id, bookTitle: 'Discrete Mathematics',
  status: 'READY', reservedAt: ago(4), readyAt: ago(1), copyId: heldCopy.id
});

console.log('Initial dataset loaded:');
console.log(`  ${Users.count()} staff accounts · ${Members.count()} members · ${Books.count()} titles · ${Copies.count()} copies`);
console.log(`  ${Loans.count()} loans · ${Reservations.count()} reservations · ${Penalties.count()} penalties`);
console.log('Generated credentials (shown once — store them now):');
for (const [who, pw] of Object.entries(generated)) console.log(`  ${who} / ${pw}`);
fs.writeFileSync(path.join(config.dataDir, '.seed-credentials.json'), JSON.stringify(generated, null, 2));
