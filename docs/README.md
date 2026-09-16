# CLMS Documentation — Index and Quick Reference

**Course:** 24CSI015 — Software Engineering with Agile Practices · **Project:** College Library Management System v1.0
**Repository:** backend `backend/` (Node 22 + Express 4, binary local-file store) · frontend `frontend/` (React 18.3 + Vite 5 SPA) · documentation `docs/` · metrics tool `tools/analyze.js`

## 1. Documentation set

| Document | Covers | Blueprint §§ |
|---|---|---|
| [unit-1-software-engineering-fundamentals-and-design.md](unit-1-software-engineering-fundamentals-and-design.md) | SDLC/process-model choice, requirements engineering (vision, stakeholders, FR/NFR → SRS), UML (use-case, class, sequences, copy state machine), layered architecture, data model and the binary-persistence decision, barcode subsystem | §§1–17 |
| [unit-2-agile-practices-and-project-management.md](unit-2-agile-practices-and-project-management.md) | Lean+Scrum+Kanban+XP combination, roles/ceremonies, estimation, 10-epic/37-story backlog, 7-sprint plan with velocity/burndown and retrospectives, JIRA evidence, team split, WBS/Gantt/PERT, COCOMO II, risk register, Git/SCM strategy | §§18–36 |
| [unit-3-testing-quality-and-devops.md](unit-3-testing-quality-and-devops.md) | Test strategy/pyramid, TDD case, EP/BVA/decision tables, Selenium journeys, white-box McCabe/Halstead, coverage tables, defect log (RES-001, UI-002, E2E-003), ISO 25010, metrics report, CMMI, CI + Docker, maintenance classes | §§26–41 |
| [sprint-plan.md](sprint-plan.md) | The full seven-sprint planning record: per-sprint goal, story tables with owners, planned/completed/carry, velocity chart, burndown, Gantt, arithmetic verification note | §§22–25 |
| [metrics-report.json](metrics-report.json) | Machine-generated static metrics (LOC, functions, McCabe, Halstead effort per file) — regenerate with `npm run metrics` | §38 |

## 2. Quick facts (all measured, not approximate)

| Fact | Value | Source |
|---|---|---|
| Stack | Node 22 / Express 4 / JWT + bcrypt RBAC · React 18.3 + Vite 5 SPA · binary-file persistence in local storage (`data/*.cdb`: MessagePack+deflate+CRC32, atomic tmp+rename) | `backend/package.json`, `db/store.js` |
| Roles | STUDENT · FACULTY · LIBRARIAN · ADMIN | `middleware/auth.js`, routes guards |
| Production size | 29 files · 1 585 LOC · 321 functions | `docs/metrics-report.json` |
| Complexity | avg McCabe **2.15**, max **14** (`policyRules.mergePolicies`) | same |
| API surface | 45 routes under `/api` (25 GET / 20 write), JSON error envelope | `backend/src/routes/index.js` |
| Automated tests | **123 passing, 6 suites** (5 domain/unit + 1 supertest REST integration) | `npx jest` output |
| E2E | 2 Selenium headless-Chrome journeys, 5 verified steps each, passing | `backend/tests/e2e/` |
| Coverage | 82.38 % stmts / 66.61 % branch / 76.25 % funcs / 88.84 % lines overall; domain 96.83 / repositories 97.05 / routes 85.51 (the three §26 core modules ≥ 80 %) | Istanbul, Unit III §7 |
| Barcodes | Code 128 SVG (bwip-js): copies `LIB-<BOOKCODE>-NNN`, members `LIB-<ROLL>` | `domain/barcodeRules.js`, `copyService` |
| Business rules | 14 d/3 books/3 holds student · 30 d/5/5 faculty · ₹1/day fine · ₹50 borrow block · 2 renewals · 48 h hold · 3-day due-soon · 5-deep queue (FACULTY→FIFO→memberId) · rec weights 40/25/15/10/10 | `domain/policyRules.js`, `domain/*.js` |
| Initial dataset | 2 staff, 4 members, 12 titles, 34 copies, 11 loans (1 overdue), 3 reservations (2 WAITING, 1 READY), 2 penalties (1 PAID, 1 UNPAID ₹7) | `backend/src/db/seed.js` |
| Agile record | 7 completed two-week sprints (1 Jun – 4 Sep 2026) · 126-pt backlog · 125 delivered · velocity mean 17.9 | `docs/sprint-plan.md` |
| JIRA | nidhish28guhan123.atlassian.net · project CLMS (id 10034) · Scrum board 35 · 55 issues (10 epics, 37 stories, 8 sub-tasks/bugs) | Unit II §6 |
| UI design system | “Modern Library Ledger” — Fraunces + IBM Plex Sans/Mono, single-origin served SPA | `frontend/src/styles.css`, `app.js` |

## 3. How to run

```bash
# prerequisites: Node 22.x
cd backend
npm install          # express, jsonwebtoken, bcryptjs, bwip-js, cors, dotenv
npm run seed         # writes the initial dataset into backend/data/*.cdb (binary)
npm start            # API + built SPA on http://localhost:4000
```

To run the SPA in development mode with hot reload (proxies `/api` to :4000): `cd frontend && npm install && npm run dev` (Vite on :5173). For the packaged single-port flow from the repo root: `npm install` in both packages, then `npm run build && npm --prefix backend start`.

**Accounts after seeding** (from `seed.js`):

| Account | Password | Role |
|---|---|---|
| `admin` | `Admin@123` | Library Admin |
| `librarian1` | `Librarian@123` | Librarian |
| `CSE2201` (also `CSE2202`, `ECE2210`, `FAC1001`) | `College@123` | Students / Faculty — member id is the roll number |

Open <http://localhost:4000>, sign in, and the dashboard, catalogue, circulation desk, My Library, reports and admin screens operate on the seeded state (1 overdue loan and a READY hold are seeded deliberately so every screen shows meaningful data).

## 4. How to test

```bash
cd backend
npm test             # 123 tests, 6 suites (domain + supertest integration)
npm run coverage     # Jest + Istanbul → backend/coverage/ (unit III §7 tables)
npm run metrics      # tools/analyze.js → docs/metrics-report.json

# E2E (requires the server running, seeded):
npm start &          # then:
npm run test:e2e     # both Selenium journeys in headless Chrome
npm run test:e2e:reserve      # journey 1 (student ECE2210)
npm run test:e2e:circulation  # journey 2 (librarian desk)
```

CI (`.github/workflows/ci.yml`) runs the unit+integration job with the coverage gate (three core modules ≥ 80 % statements), the metrics regeneration, and the frontend production build on every push/PR to `main`.

## 5. Evidence conventions used across these documents

- **Measured** — reproducible commands: `npm test`, `npm run coverage`, `npm run metrics`; numbers quoted verbatim from their output.
- **Planning record** — sprint dates, velocity tables, burndown narratives, retrospectives: maintained by the team in this docs set and the JIRA project; labelled wherever they appear.
- **Design documentation** — blueprint §§ cited per section; where implementation deviates (binary-file persistence instead of PostgreSQL), the deviation is stated as a recorded decision, not glossed over.
