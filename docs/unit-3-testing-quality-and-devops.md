# Unit III — Software Testing, Quality and DevOps

**Course:** 24CSI015 — Software Engineering with Agile Practices
**Project:** College Library Management System (CLMS) · v1.0
**Traceability:** blueprint §§26–41. Every count below is reproduced from the repository: `npx jest` output (123 tests, 6 suites), Istanbul coverage (`backend/coverage/`), `docs/metrics-report.json` (acorn AST metrics), `.github/workflows/ci.yml` and the Docker files at `backend/`, `frontend/`, repo root.

---

## 1. Test strategy and test pyramid (§26)

Strategy: tests are written **with** each increment (XP, §18), defects are only closed by a test that fails without the fix, and the CI pipeline enforces the coverage rule mechanically (§11).

| Level | Tooling | Volume (measured) | Scope |
|---|---|---:|---|
| Unit (domain, pure functions) | Jest | **71 tests / 5 suites** | loan/copy/reservation/penalty/member/policy/barcode/recommendation rules; BinaryStore crash-shape, CRC32 corruption-rejection and JSON→binary migration behaviour |
| Integration (REST API) | Jest + supertest | **52 tests / 1 suite** | full request path: auth, RBAC, catalogue, copies/barcode (incl. SVG), circulation lifecycle, reservations + RES-001 regression, penalties, recommendations, notifications, reports, admin |
| System / E2E (UI) | Selenium + headless Chrome | **2 journeys × 5 verified steps** | student reservation journey; librarian issue/return journey (real HTTP + real SPA, server on :4000) |
| Acceptance walkthrough | sprint review | 7 reviews (planning record) | acceptance criteria per story (Unit II §3.1) |

`123 automated tests, 6 suites — re-verified in this session (jest output: “Tests: 123 passed, 6 total”).`

**§26 syllabus rule — “at least three core modules with a minimum 80 % code-coverage target”: SATISFIED.**
Statement coverage by module: `src/domain` **96.83 %**, `src/repositories` **97.05 %**, `src/routes` **85.51 %** — three core modules above 80 %. Precisely stated: the aggregate over all files is 82.38 % statements / 88.84 % lines; `src/services` sits at 73.91 % statements, an **accepted trade-off** (§12) because service behaviour is exercised through the 52-route integration suite and the domain rules it delegates to are near-fully covered.

## 2. Test inventory (real suite names)

| Suite | File | Tests | Representative coverage |
|---|---|---:|---|
| BinaryStore | `tests/domain/store.test.js` | 10 | atomic write/rename, opaque binary container (magic+CRC32), corruption rejection, legacy-JSON migration, replaceAll |
| Loan rules | `tests/domain/loanRules.test.js` | 21 | due-date BVA, `canIssue` decision table T1–T5, renewability |
| Reservation rules | `tests/domain/reservationRules.test.js` | 11 | queue order FACULTY→FIFO→memberId, duplicate/queue-limit |
| Member/penalty/policy | `tests/domain/memberPenaltyPolicy.test.js` | 18 | member validation, ₹1/day penalties, policy merge/validator |
| Barcode + recommendation | `tests/domain/barcodeRecommendation.test.js` | 11 | `LIB-<BOOKCODE>-NNN` parse/build, weight scoring, reasons |
| REST integration | `tests/integration/api.test.js` | 52 | describe blocks “Authentication (US-01..US-03)”, “RBAC (blueprint §16)”, “Catalogue (US-05..US-10)”, “Copies & unique barcodes (US-11, US-12)”, “Circulation — issue/return/renew (US-13..US-17)”, “Reservations + queue (US-18..US-21) incl. RES-001 regression”, “Penalties (US-22, US-23)”, “Recommendations (US-26..US-28)”, “Notifications (US-29..US-31) + reports + admin” |

## 3. Black-box design techniques on real rules

### 3.1 Equivalence partitions (§27)

**Borrowing count vs student limit 3 (§27 Scenario 1 adapted to the real limit):**

| Partition | Class | Representative value | Expected | Tested in |
|---|---|---:|---|---|
| 0–2 | valid — under limit | 1 | issue allowed | `loanRules.test.js` T1 |
| 3 | valid — at limit boundary | 3 | blocked (limit reached) | T3 (BVA: count == limit) |
| 4+ | invalid — over limit (defensive) | 4 | blocked | T3 family |
| any, dues ≥ 50 | invalid — fine block | dues = 50 | blocked at threshold exactly | T4 (BVA: dues == threshold) |
| any, member SUSPENDED/BLOCKED | invalid — status | — | blocked, reasons listed | T2, T5 (multiple failures report every reason) |

**Search keyword (§27 Scenario 2, real rule: non-empty term, ≤ 50 chars by API guard):** empty → validation message; 1–50 → search executes (`"Java"` returns matches); > 50 → rejected/empty result set. Search matching itself is partitioned by field class (title / author / ISBN / keyword / category) with one valid representative each in the integration catalogue block.

**Copy-status partitions for issue:** `{AVAILABLE}` eligible; `{ISSUED}` duplicate-issue refused; `{RESERVED}` refused (held for another member); `{LOST, DAMAGED, MAINTENANCE}` non-circulating — covered by `canIssueCopy` unit tests plus the integration “issue a reserved copy” refusal case.

### 3.2 Boundary value analysis (§28)

| Rule (real constant) | Boundary inputs | Expectation | Test |
|---|---|---|---|
| Loan period STUDENT = 14 d | day 13 / **day 14 / day 15** | 0 late / 0 late at exact due-day-end / 1 late | `loanRules.test.js`: “BVA: one day past due = 1 late day”, “1 second before due is not overdue (BVA boundary)”, “+1 second past” |
| Borrow limit STUDENT 3 / FACULTY 5 | 2 / **3 / 4**; 4 / **5 / 6** | allowed / allowed-at-limit then next issue blocked | “T3 borrow limit reached (BVA: count == limit)”, “T3b one below limit” |
| Fine block ₹50 | 49 / **50** / 51 | allowed / **blocked** / blocked | “T4 fine block at threshold exactly” |
| Renew limit 2 | used 1 / **2** / 3 | allowed / blocked `RENEW_LIMIT` | `canRenew` “renew limit BVA: used == limit blocked” |
| Hold window 48 h | 47 h / **48 h** / 49 h | READY / expiring / EXPIRED | reservation service integration + sweep unit cases |
| Queue depth 5 | length 4 / **5** | admitted / `QUEUE_FULL` | `reservationRules.test.js` |
| Loan period of 1 day | 1 (BVA min) | due = issue + 1 d at day-end | “loan period of 1 day (BVA min)” |

### 3.3 Decision tables (§29)

**Issue eligibility (conditions as evaluated by `loanRules.canIssue`):**

| Condition | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|
| Member ACTIVE? | Y | Y | Y | N | Y |
| Active loans < limit? | Y | Y | N | Y | Y |
| Unpaid dues < ₹50? | Y | Y | Y | Y | N |
| **Issue?** | **Yes** | No (copy state) | No (LIMIT) | No (status) | No (FINE_BLOCK) |

R2 additionally encodes the copy-state column (`canIssueCopy`). R5 combined-failure reporting is exercised by “T5 multiple failures report every reason”.

**Renewability (`loanRules.canRenew`):**

| Condition | R1 | R2 | R3 | R4 |
|---|---|---|---|---|
| renewalsUsed < 2? | Y | Y | Y | N |
| Loan not overdue? | Y | N | Y | Y |
| Queue empty for title? | Y | Y | N | Y |
| **Renew?** | **Yes** | No | No | No |

**Reservation (`reservationRules.canReserve`):** allow only when no copy of the title is `AVAILABLE`, the member has no active reservation for it, member hold count < `maxReservations`, and queue length < 5.

## 4. TDD cycle (§30) — the due-date BVA case, as it happened

| Step | Action (real artefacts) |
|---|---|
| **Red** | Sprint 2, before `computeDueDate` existed: `loanRules.test.js` written first with “14-day student loan lands exactly 14 days later at day-end” and the 1-day BVA-min case — suite fails (function missing), which is the intended first red |
| **Green** | Minimal `computeDueDate(issueDate, loanDays)` implemented with end-of-day due stamping; the two boundary tests pass |
| **Red again (new knowledge)** | Overdue detection specified: “active loan 1 second before due is not overdue (BVA boundary)” and “+1 second past” — first cut using date-only comparison failed the ±1-second pair |
| **Green + refactor** | Comparison fixed to a timestamp boundary; refactor extracted `isOverdue`, `daysLate`, `daysUntil` as separate pure functions (final file: 52 LOC, 7 functions, avg CC 2.29 — `metrics-report.json`) |
| **Regression** | The boundary pair now runs in every CI execution; `penaltyService` and the ₹1/day calculation were then written test-first against `daysLate`, i.e. the same cycle one layer up |

The story is representative of XP §18's loop: the boundary tests were written *because* the BVA table existed, not after the implementation “looked done”.

## 5. Selenium E2E (§31)

Two headless-Chrome journeys against the running server (`backend/tests/e2e/selenium-flow.js`, `selenium-circulation.js`), 5 verified steps each, both passing:

**Journey 1 — student reservation flow (`selenium-flow.js`):**

| # | Verified step |
|---|---|
| 1 | Student **ECE2210** signs in; dashboard stats render |
| 2 | Dashboard lists the active loan (Computer Networks) and fine summary |
| 3 | Catalogue search “Discrete Mathematics”; detail page shows a **RESERVED** copy badge |
| 4 | My Library → Reservations shows the **READY** hold with the 48 h collection note |
| 5 | Fines tab shows the overdue penalty **₹7.00** produced by the automated sweep |

**Journey 2 — librarian circulation flow (`selenium-circulation.js`):**

| # | Verified step |
|---|---|
| 1 | Librarian signs in; desk navigation available |
| 2 | Scan `LIB-CSE2201` → eligibility card: Arun Karthik R, limit + dues shown |
| 3 | Scan `LIB-CSHFP04-002` → issue succeeds; receipt shows title, **Due date** and copy barcode |
| 4 | **Code 128 barcode rendered in the receipt** through the authenticated SVG fetch (proof of the UI-002 fix) |
| 5 | Return tab processes the copy; status **AVAILABLE** re-verified via the REST API (UI + data-state agreement) |

Both journeys follow the §31 flow (login → search/open → action → verify confirmation) and run against the real single-origin build on port 4000.

## 6. White-box testing and static metrics (§32)

McCabe V(G) = E − N + 2P computed per function over acorn ASTs (decision nodes: if/loops/switch-case/conditional/`&&`/`||`; `??` and `default:` deliberately excluded — see `tools/analyze.js`):

| Measured (whole production source) | Value |
|---|---|
| Files / LOC / functions | 29 / 1 585 / 321 |
| Average cyclomatic complexity | **2.15** |
| Maximum cyclomatic complexity | **14** |
| Functions with CC > 10 | 4 (table below, `metrics-report.json` `highComplexityFns`) |

| Hotspot function | File | CC | Why it is complex (accepted) |
|---|---|---:|---|
| `mergePolicies` (policy merge/validation of admin-supplied defaults) | `domain/policyRules.js` | **14** | guards every policy field's type/range in one place — deliberately centralised (§35 R3) |
| `issue` (eligibility + copy state + due date path) | `services/circulationService.js` | 13 | linear orchestration of independent guards; decision-table tests pin every branch |
| `similarTo` | `services/recommendationService.js` | 13 | candidate filter cascade over loans/reservations/copies |
| `cancel` | `services/reservationService.js` | 12 | RES-001 fix: pre-cancel snapshot + redispatch branching |

Control-flow criterion: statement + branch coverage (§32) drives “paths through the hotspots” — each guard in `issue`/`canIssue`/`canRenew` has a named test (Unit III §3.3 rows), and `policyRules` validation is exercised from both accept and reject partitions.

## 7. Coverage — measured (Jest + Istanbul, current run)

| Module | Stmts | Branch | Funcs | Lines |
|---|---:|---:|---:|---:|
| **All production files** | **82.38 %** (917/1113) | 66.61 % | 76.25 % | **88.84 %** |
| src/domain | 96.83 % (153/158) | 89.92 % | 94.73 % | 98.30 % |
| src/repositories | 97.05 % (33/34) | 75.00 % | 92.31 % | 96.96 % |
| src/routes | 85.51 % (124/145) | 65.00 % | 70.58 % | 97.82 % |
| src/db (BinaryStore) | 92.12 % (117/127) | 75.00 % | 95.83 % | 99.01 % |
| src/middleware | 92.30 % (24/26) | 85.71 % | 85.71 % | 100 % |
| src/utils | 94.11 % (16/17) | 66.66 % | 85.71 % | 100 % |
| src/services | 73.91 % (425/575) | 56.42 % | 69.71 % | 80.95 % |

\* statement totals as reported in the lcov summary; percentages are the reported Istanbul values, unrounded figures where given.

Reading of the table: the three §26 core modules (domain, repositories, routes) clear the 80 % bar with margin. The two weakest branch figures — `services` 56.42 % and `routes` 65 % — are dominated by defensive error arms (unknown-parameter rejects, 404 fallbacks) whose end-to-end cost/benefit was judged acceptable against the alternative of mocking repository internals; this is recorded as the accepted trade-off it is, and the CI gate (§11) locks the bar so it cannot silently degrade.

## 8. Software metrics report (§38) — from `docs/metrics-report.json`

Acorn-AST analyzer, 29 production files (`npm run metrics` regenerates; Halstead effort = Volume × Difficulty summed per file):

| File | LOC | Fns | Avg CC | Max CC | Worst fn | Halstead effort |
|---|---:|---:|---:|---:|---|---:|
| backend/src/app.js | 43 | 5 | 2.00 | 4 | createApp | 6 220 |
| backend/src/config.js | 12 | 0 | 0.00 | 1 | — | 0 |
| backend/src/db/store.js | 188 | 24 | 1.88 | 8 | decodeFile | 11 165 |
| backend/src/domain/barcodeRules.js | 18 | 3 | 1.67 | 3 | parseCopyBarcode | 218 |
| backend/src/domain/copyRules.js | 16 | 2 | 3.50 | 5 | canIssueCopy | 719 |
| backend/src/domain/loanRules.js | 52 | 7 | 2.29 | 5 | canIssue | 1 760 |
| backend/src/domain/memberRules.js | 43 | 6 | 3.00 | 8 | validateMemberInput | 1 640 |
| backend/src/domain/penaltyRules.js | 18 | 3 | 1.33 | 2 | calculatePenalty | 211 |
| backend/src/domain/policyRules.js | 43 | 2 | 8.00 | **14** | mergePolicies | 6 522 |
| backend/src/domain/recommendationRules.js | 62 | 7 | 5.29 | 9 | scoreBook | 12 627 |
| backend/src/domain/reservationRules.js | 42 | 8 | 2.25 | 5 | canReserve | 1 675 |
| backend/src/middleware/auth.js | 39 | 7 | 2.29 | 4 | authenticate | 1 214 |
| backend/src/repositories/index.js | 29 | 2 | 1.50 | 2 | (anonymous) | 97 |
| backend/src/repositories/repository.js | 29 | 11 | 1.27 | 2 | (anonymous) | 321 |
| backend/src/routes/index.js | 127 | 51 | 1.20 | 3 | assertSelfOrStaff | 1 504 |
| backend/src/server.js | 10 | 1 | 1.00 | 1 | (anonymous) | 20 |
| backend/src/services/adminService.js | 64 | 12 | 2.00 | 7 | scan | 8 586 |
| backend/src/services/auditService.js | 19 | 2 | 4.00 | 6 | record | 419 |
| backend/src/services/authService.js | 47 | 7 | 2.71 | 6 | login | 3 874 |
| backend/src/services/catalogueService.js | 79 | 21 | 2.19 | 8 | search | 8 898 |
| backend/src/services/circulationService.js | 126 | 18 | 3.39 | **13** | issue | **22 704** |
| backend/src/services/copyService.js | 66 | 9 | 2.67 | 8 | updateCopy | 8 341 |
| backend/src/services/memberService.js | 86 | 22 | 2.55 | 8 | create | 6 157 |
| backend/src/services/notifyService.js | 25 | 6 | 2.67 | 6 | notify | 1 469 |
| backend/src/services/penaltyService.js | 26 | 7 | 1.71 | 4 | clear | 1 287 |
| backend/src/services/recommendationService.js | 56 | 24 | 1.75 | **13** | similarTo | 10 563 |
| backend/src/services/reportService.js | 80 | 24 | 1.63 | 4 | popularBooks | 7 669 |
| backend/src/services/reservationService.js | 121 | 23 | 2.74 | **12** | cancel | 16 976 |
| backend/src/utils/errors.js | 16 | 7 | 1.00 | 1 | (anonymous) | 260 |

Interpretation: effort concentrates in the orchestration services (issue 22.7 k, cancel 17.0 k) and the scoring rules (12.6 k) — exactly the modules carrying the business-value decisions; the domain layer keeps high volume with low complexity except the intentional policy validator. Halstead is reported at effort level only (the analyzer's summed per-file figure); no fabricated volume/difficulty constants are presented beyond what `tools/analyze.js` computes.

## 9. Defect management (§33) — full lifecycle entries

Lifecycle per §33: `NEW → ASSIGNED → IN PROGRESS → FIXED → RETEST → CLOSED` (retest failure reopens).

**RES-001 — READY-hold cancellation strands a physical copy**

| Field | Record |
|---|---|
| Defect ID / Module | RES-001 / Reservations (E6) — `reservationService.cancel`, copy dispatch |
| Found / by | Sprint 3 testing (Kanban TESTING column blocked the story; caused US-15 carry) |
| Severity / priority | Major / High — inventory availability loss |
| Reproduction | Cancel a reservation in state READY (copy held with `heldFor`) |
| Actual result | Copy left `RESERVED` pointing at a departed holder — out of circulation indefinitely |
| Expected result | Copy returns to circulation: either to the next queued member (READY + notification) or AVAILABLE |
| Fix | Snapshot pre-cancel state; on cancel/expire of a READY hold, redispatch the copy down the queue (US-21) |
| Retest / close | Pinned by the integration case in “Reservations + queue … incl. RES-001 regression”; closed S4, still passing in the 123-test run |

**UI-002 — barcode SVG cannot authenticate through `<img>`**

| Field | Record |
|---|---|
| Defect ID / Module | UI-002 / Frontend barcode surface (`BarcodeSvg.jsx`, `GET /api/barcodes/:code/svg`) |
| Found / by | Sprint 6 desk flow walkthrough — receipts showed empty barcode slots |
| Severity / priority | Major / High — circulation receipts are the primary desk artefact |
| Reproduction | Render `<img src="/api/barcodes/LIB-…-002/svg">` while signed in |
| Actual result | 401 — `<img>` requests cannot carry the `Authorization: Bearer` header |
| Expected result | Receipt shows the Code 128 label for the issued copy |
| Fix | Authenticated `fetchText()` + injected SVG markup with spinner/aria label; same pattern for member badges |
| Retest / close | Proven by Selenium journey 2 step 4 (“Code-128 barcode rendered … authenticated SVG fetch”); closed in S6 |

**E2E-003 — login selector depended on autofocus and flaked**

| Field | Record |
|---|---|
| Defect ID / Module | E2E-003 / E2E suite (`tests/e2e/*.js`) |
| Found / by | Sprint 6 — Journey 1 intermittently failed at sign-in |
| Severity / priority | Minor / Medium — evidence reliability, not product behaviour |
| Reproduction | Run journey repeatedly; focus order varied with page-load timing |
| Actual result | Driver typed into the wrong input (focus-relative selector) |
| Expected result | Deterministic input targeting |
| Fix | Explicit `.login-card input` positional indexing (aria-labelled desk inputs likewise) |
| Retest / close | Both journeys 5/5 steps green; closed S7 |

**AUTH-001 — page refresh silently emptied every member view (principal-shape drift)**

| Field | Record |
|---|---|
| Defect ID / Module | AUTH-001 / Auth surface (`GET /api/auth/me`) + SPA session restore |
| Found / by | Binary-store verification pass — headless-Chrome reload probe after sign-in |
| Severity / priority | Major / High — pressing F5 as a student left the dashboard and My Library permanently empty |
| Reproduction | Sign in as a member, reload the SPA. `/auth/me` returned the raw JWT payload (`sub`, `iat`, `exp`) while `/auth/login` returns the principal with `id`; the client stored `user.id` and then called `/members/undefined/history` |
| Actual result | Restored session produced a principal without `id`; every member-scoped request 404s and the views render nothing |
| Expected result | `/auth/me` and `/auth/login` return the same principal shape |
| Fix | `routes/index.js` — `/auth/me` normalises `{sub, iat, exp, …}` → `{id, …}`; regression assertion added to the integration suite (`id` defined, `sub` absent) |
| Retest / close | Reload probe green — loan and hold render from the restored session; pinned in `api.test.js`; CLOSED |

**E2E-004 — student journey raced React's commit and flaked**

| Field | Record |
|---|---|
| Defect ID / Module | E2E-004 / E2E suite (`tests/e2e/selenium-flow.js`) |
| Found / by | Regression runs after the storage change — journey 1 step 2 intermittently failed |
| Severity / priority | Minor / Medium — evidence reliability, not product behaviour (manual probe confirmed the content rendered in ~11 ms) |
| Reproduction | Assert on `body` text immediately after `elementsLocated('.stat')` resolves — the class exists in a partially painted commit |
| Actual result | Assertion captured the shell (154-char body) before stat values and the loan row were painted |
| Expected result | Deterministic wait on rendered content, not on the DOM skeleton |
| Fix | Journey 1 waits for `.stat-value` elements (rendered only after the history API resolves) and polls body text until the loan title appears before asserting; added the ₹7.00 fine-total assertion |
| Retest / close | Student journey green on repeated consecutive headless runs; CLOSED |

## 10. ISO/IEC 25010 assessment (§37) — all eight characteristics

| Characteristic | Assessment | Evidence |
|---|---|---|
| Functional suitability | Met — all 17 FRs traced (§Unit I 2.3) | 123 tests; E2E agreements on live state |
| Performance efficiency | Met at target scale | in-process reads over 34-copy/12-title dataset; response times sub-millisecond-class locally; 512 kB body cap; JSON O(n) scans noted as scale limit (Unit I §4.3) |
| Compatibility | Met | CORS + same-origin single-port mode; nginx reverse-proxy path in compose; REST + JSON contract |
| Usability | Met | scan-first desk (keyboard-wedge inputs), role-aware navigation, clear availability badges, explainable recommendation reasons, accessible labels (`aria-label` on barcode slots/inputs) |
| Reliability | Met | atomic tmp+rename writes; guarded state transitions (no invalid copy states); RES-001 class fixed + regression-pinned; health endpoint for orchestrator restarts |
| Security | Met | bcrypt hashes; JWT expiry; route-level `requireRole` guards; self-or-staff data scoping; central error envelope prevents stack/info leaks; audit trail |
| Maintainability | Met | layering + pure domain core; avg CC 2.15, only 4 fns > 10; metrics + coverage tooling in repo; conventions in Unit II §10 |
| Portability | Met | Node 22 slim/alpine images, no native deps; DATA_DIR/VOLUME data location configurable; env-driven config; compose declares runtime |

## 11. DevOps — CI and containers (§40) — built from the actual files

**Pipeline** `.github/workflows/ci.yml` (two jobs, Node 22, npm cache, on push/PR to `main`):

| Stage | Step (verbatim job behaviour) |
|---|---|
| 1 Checkout | `actions/checkout@v4` |
| 2 Setup + install | `setup-node@v4`, `npm ci` (backend / frontend separately) |
| 3 Test | `npx jest --coverage --coverageReporters=json-summary --runInBand --forceExit` |
| 4 Static metrics | `node ../tools/analyze.js` → regenerates `docs/metrics-report.json` |
| 5 **Coverage gate** | inline Node script over `coverage-summary.json`: `src/domain`, `src/repositories`, `src/routes` each ≥ 80 % statements, `continue-on-error: false` — the §26 syllabus rule encoded as a build failure |
| 6 Build | frontend job: `npm run build` (Vite bundle) |

**Containers** (all present in the repo, read at review time):

| Artefact | Content highlights |
|---|---|
| `backend/Dockerfile` | `node:22-alpine`, `npm ci --omit=dev`, `VOLUME /app/data` + `DATA_DIR` env (“JSON data lives in a named volume, never in the image”), `EXPOSE 4000`, `HEALTHCHECK` polling `/api/health` |
| `frontend/Dockerfile` | multi-stage: `node:22-alpine` build (`npm ci` + `vite build`) → `nginx:1.27-alpine` static serve |
| `frontend/nginx.conf` | SPA fallback `try_files … /index.html`; `proxy_pass http://backend:4000` for `/api/`; gzip incl. `image/svg+xml` |
| `docker-compose.yml` | `backend` (named volume `clms-data`, `JWT_SECRET` required-at-parse `${JWT_SECRET:?…}`, restart `unless-stopped`) + `web` on 8080, `depends_on: backend: condition: service_healthy` |

Deployment topology (§40 pipeline diagram): push → Actions (test/gate/build) → images → compose `up` → browser:8080 → nginx/api → backend:4000 → JSON volume. The same-origin single-process mode (`npm start` serving `frontend/dist` on :4000) is the lighter alternative used for local E2E runs.

## 12. Software maintenance classification (§41) — with this project's real instances

| Type | Blueprint example (§41) | Actual instance(s) in CLMS |
|---|---|---|
| **Corrective** | fix incorrect penalty/reservation logic | RES-001 redispatch fix (US-21 + regression test); UI-002 authenticated SVG rendering; E2E-003 selector determinism |
| **Adaptive** | college changes library policy | `PUT /api/admin/policies` — role loan days/book/hold limits, ₹/day, block threshold, renew cap, hold window, queue depth are admin-editable data; new role types would extend `policyRules.roles` |
| **Perfective** | improve search/recommendation quality | weight re-tuning in `recommendationRules.WEIGHTS`; result-surfacing improvements; deferred US-37 (postgraduate project browsing portal) is v1.1's first perfective candidate |
| **Preventive** | refactor + strengthen tests | coverage gate + metrics analyzer as ratchets; CC-hotspot watchlist (four >10 functions listed §6) drives deliberate split decisions; store/atomicity suite guards the persistence assumption |

## 13. Quality summary

| Gate | Threshold | Actual | Verdict |
|---|---|---|---|
| Automated tests pass | 123/123, 6/6 | 123/123 (re-run for this report) | PASS |
| Selenium journeys | 2 × 5 steps | both green | PASS |
| §26 coverage rule | ≥ 3 core modules ≥ 80 % stmts | domain 96.83, repositories 97.05, routes 85.51 | PASS |
| Complexity policy | no uncontrolled hotspots | avg 2.15; max 14 (intentional validator); 4 fns > 10 all test-pinned | PASS with noted exceptions |
| E2E + CI evidence | defect log closed, gate wired | 5 defects CLOSED (incl. AUTH-001, E2E-004 post-release); gate in `ci.yml` | PASS |

## 14. CMMI level 3 mapping (§39)

| CMMI-DEV practice area (Level 3) | Institutionalised here through |
|---|---|
| Requirement Development / Management (RD, REQM) | blueprint §§1–16 → FR/NFR trace tables maintained into code and tests (Unit I §2.3) |
| Project Planning / Monitoring (PP, PMC) | backlog + 7-sprint plan with planned/completed variance, carry and deferral recorded as decisions, not silences (Unit II §5) |
| Measurement and Analysis (MA) | `tools/analyze.js` metrics report, Istanbul coverage, velocity/carry metrics — all regenerated, not asserted |
| Verification (VER) | CI test + gate on every push/PR; decision-table/BVA/EP packs derived from specifications before code |
| Validation (VAL) | sprint reviews against acceptance criteria; Selenium journeys as customer-view confirmation |
| Peer Reviews | two-person review on every module-scoped commit before `CODE REVIEW → TESTING` (Kanban column §2) |
| Configuration Management (CM) | Git baselines per milestone, conventional module commits, JIRA cards ↔ commit references |
| Causal Analysis and Resolution (CAR) | RES-001 → root-caused to READY-cancel state loss → process change (fixer capacity reserved in S6/S7 plans); UI-002 → auth-asset loading convention |
| Organisational Process Definition (OPD) | the combined Lean+Scrum+Kanban+XP working agreement reused across all seven sprints; ceremony calendar and WIP policy as standing assets |
