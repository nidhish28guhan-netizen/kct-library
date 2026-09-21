# KCT Library

A complete, working library management system for a college central library:
catalogue with physical copies, Code 128 barcodes, issue/return desk,
reservations with queues, fines, policies, notifications, reports and an
audit trail.

- **Backend** — Node 22 / Express 4, layered (routes → services → domain →
  repositories → binary `.cdb` file store with atomic writes), JWT auth, RBAC
  (STUDENT / FACULTY / LIBRARIAN / ADMIN), Code 128 barcodes, policies,
  reservations, penalties, recommendations, notifications, reports, audit trail.
- **Frontend** — Electron + Vite + React 18 desktop app ("Modern Library
  Ledger" design — Fraunces / IBM Plex), role-aware navigation, print-ready
  loan receipts. The same React build also runs as a web app served by the
  backend.
- **Quality** — automated test suites, two Selenium end-to-end journeys,
  high statement coverage on the core modules, static metrics via
  `tools/analyze.js` (`docs/metrics-report.json`).

## Run it (desktop app)

```bash
npm install                 # in backend/ and frontend/
cd frontend && npm run electron:dev   # builds the UI, starts the API, opens the window
```

Prefer the plain web app? Build the UI and start the API:

```bash
cd frontend && npm run build
cd ../backend && npm start
# → http://localhost:4000
```

To load a demo dataset (books, copies, members, loans, a reservation and a
fine): `cd backend && npm run seed`. The seeder **generates** every account
password and prints each one once — no default passwords exist anywhere in
this repository. Store them when you see them.

## Roles and their workflows

See [`docs/workflows.md`](docs/workflows.md) for the full description of how
each role uses the system. Summary:

| Role | What they do |
|---|---|
| **Student / Faculty (member)** | Search the catalogue, borrow and return books, renew, reserve a title, pay fines, track their own borrowing history |
| **Librarian** | Run the issue/return desk (scan member + book barcodes), register members, catalogue books and copies, collect fines |
| **Admin** | Everything a librarian can do, plus staff accounts, lending policies, reports and the audit log |

## Test it

```bash
cd backend
npm test          # unit + integration suites
npm run test:e2e  # both Selenium journeys (server must be running)
npm run metrics   # regenerate docs/metrics-report.json
```

## Documentation

- [`docs/workflows.md`](docs/workflows.md) — how students, teachers, librarians
  and admins each use the system, and the end-to-end application workflow.
- [`docs/README.md`](docs/README.md) — architecture, modules and data model.
- [`docs/metrics-report.json`](docs/metrics-report.json) — static metrics.

CI: GitHub Actions (`backend` test+coverage gate, `frontend` build) runs on
every push to `main`.
