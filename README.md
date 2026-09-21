# KCT Library — College Library Management System

A complete, working library management system for the **24CSI015 – Software
Engineering with Agile Practices** course project. Built and delivered over
seven two-week sprints (Jira project `NS` ("KCT Library")).

- **Backend** — Node 22 / Express 4, layered (routes → services → domain →
  repositories → JSON-file store with atomic writes), JWT auth, RBAC
  (STUDENT / FACULTY / LIBRARIAN / ADMIN), Code 128 barcodes, policies,
  reservations with queues, penalties, recommendations, notifications,
  reports, audit trail.
- **Frontend** — React 18 + Vite 5 SPA, "Modern Library Ledger" design
  (Fraunces / IBM Plex), role-aware navigation, print-ready loan receipts.
- **Quality** — 121 automated tests (6 suites), 2 Selenium end-to-end
  journeys, ≥80 % statement coverage on the three core modules
  (domain 96.8 %, repositories 97.1 %, routes 85.4 %), static metrics via
  `tools/analyze.js` (`docs/metrics-report.json`).

## Run it

```bash
npm install                 # in backend/ and frontend/
cd frontend && npm run build
cd ../backend && npm run seed && npm start
# → http://localhost:4000
```

Accounts are created by an administrator via **Admin → Audit Log → staff
accounts** (`POST /api/admin/users`, ADMIN only). There are no built-in
accounts; the first admin is created by the seeder and every password is
stored only as a bcrypt hash.

## Test it

```bash
cd backend
npm test          # 121 unit + integration tests
npm run test:e2e  # both Selenium journeys (server must be running)
npm run metrics   # regenerate docs/metrics-report.json
```

## Documentation

Academic evidence is organised by syllabus unit in [`docs/`](docs/):

| Unit | Document |
|---|---|
| I | [SE Fundamentals & System Design](docs/unit-1-software-engineering-fundamentals-and-design.md) |
| II | [Agile Practices & Project Management](docs/unit-2-agile-practices-and-project-management.md) |
| III | [Testing, Quality & DevOps](docs/unit-3-testing-quality-and-devops.md) |

Plus [`docs/sprint-plan.md`](docs/sprint-plan.md), [`docs/README.md`](docs/README.md)
and seminar decks in [`presentation/`](presentation/).

## Containerised

```bash
JWT_SECRET=… docker compose up --build   # web on :8080, API behind nginx
```

CI: GitHub Actions (`backend` test+coverage gate, `frontend` build) runs on
every push to `main`.
