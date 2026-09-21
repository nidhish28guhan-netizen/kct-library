# KCT Library — Documentation

**Stack:** backend `backend/` (Node 22 + Express 4, binary local-file store) ·
frontend `frontend/` (Electron + Vite + React 18.3 desktop app; the same build
also runs as a web app) · documentation `docs/` · metrics tool `tools/analyze.js`.

## 1. Documentation set

| Document | Covers |
|---|---|
| [workflows.md](workflows.md) | How students, teachers, librarians and admins each use the system, and the end-to-end application workflow |
| [metrics-report.json](metrics-report.json) | Machine-generated static metrics (LOC, functions, McCabe, Halstead effort per file) — regenerate with `npm run metrics` |

## 2. Quick facts

| Fact | Value | Source |
|---|---|---|
| Stack | Node 22 / Express 4 / JWT + bcrypt RBAC · Electron + Vite + React 18.3 · binary-file persistence (`data/*.cdb`: MessagePack+deflate+CRC32, atomic tmp+rename) | `backend/package.json`, `db/store.js` |
| Roles | STUDENT · FACULTY · LIBRARIAN · ADMIN | `middleware/auth.js`, route guards |
| Complexity | avg McCabe **2.15**, max **14** (`policyRules.mergePolicies`) | `docs/metrics-report.json` |
| API surface | 45 routes under `/api` (25 GET / 20 write), JSON error envelope | `backend/src/routes/index.js` |
| Barcodes | Code 128 SVG (bwip-js): copies `LIB-<BOOKCODE>-NNN`, members `LIB-<ROLL>` | `domain/barcodeRules.js`, `copyService` |
| Business rules | 14 d/3 books/3 holds student · 30 d/5/5 faculty · ₹1/day fine · ₹50 borrow block · 2 renewals · 48 h hold · 3-day due-soon · 5-deep queue | `domain/policyRules.js`, `domain/*.js` |
| Initial dataset | 2 staff, 4 members, 12 titles, 34 copies, 11 loans (1 overdue), 3 reservations, 2 penalties | `backend/src/db/seed.js` |

## 3. How to run

```bash
# prerequisites: Node 22.x
cd backend && npm install
cd ../frontend && npm install

# desktop app (builds the UI, starts the API, opens the window)
cd frontend && npm run electron:dev

# or the plain web app
cd frontend && npm run build
cd ../backend && npm run seed   # optional demo dataset
npm start                       # API + built UI on http://localhost:4000
```

The seeder generates every account password and prints it **once**; no default
passwords are stored in this repository. Staff accounts can also be created
through the ADMIN-only `POST /api/admin/users` endpoint.

Open the app, sign in, and the dashboard, catalogue, circulation desk, My
Library, reports and admin screens operate on the seeded state (one overdue
loan and a READY hold are seeded deliberately so every screen shows data).

## 4. How to test

```bash
cd backend
npm test          # unit + integration suites
npm run test:e2e  # 2 Selenium headless-Chrome journeys (server must be running)
npm run metrics   # regenerate docs/metrics-report.json
```

## 5. Layout

```
backend/
  src/routes/       API endpoints (auth, books, copies, circulation, members, reports, admin)
  src/services/     orchestration: circulation, catalogue, members, reservations, penalties
  src/domain/       pure business rules (loan, policy, member, barcode, penalty rules)
  src/repositories/ collection access over the binary store
  src/db/           binary .cdb store, seed and reset scripts
  tests/            domain, integration (supertest) and e2e (Selenium)
frontend/
  electron/         Electron main process (spawns the API, opens the window)
  src/              React app: pages, components, auth, theme
docs/               workflows and metrics
tools/              static analyzer
```
