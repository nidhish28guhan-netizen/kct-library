#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Unit I — SE Fundamentals & System Design (16 slides)."""
import os
from deckkit import *

def build():
    d = unit_dir("unit-1")
    chart_barcode(os.path.join(d, "media", "barcode-motif.png"))
    names = []

    def P_(name, els, pt="content"):
        write_page(d, name, els, pt); names.append(name)

    # 1 cover -----------------------------------------------------------
    P_("01_cover.page", cover("I", ["SE Fundamentals &", "System Design"],
        "How CLMS was framed, specified and designed before the first sprint opened.",
        "deck 1 / 3"), "cover")

    # 2 agenda ----------------------------------------------------------
    els, y = header("Agenda · Unit I", "What this unit covers")
    parts = [("01", "FRAMING", "Problem statement · stakeholders and roles"),
             ("02", "METHOD", "SDLC choice · requirements engineering · traceability"),
             ("03", "MODELLING", "Use cases · class model · state machine · issue sequence"),
             ("04", "ARCHITECTURE", "Layered backend · binary store · barcodes · data · principles")]
    yy = 190
    for num, t, topics in parts:
        els.append(HL(M, yy - 16, 1136))
        els.append(T(M, yy, 70, 30, num, size=17, color=BRASS, font=MONO, bold=True, wrap=False))
        els.append(T(M + 92, yy - 3, 500, 34, t, size=21, color=INK, font=DISPLAY, bold=True, wrap=False))
        els.append(T(608, yy + 2, 600, 28, topics, size=14.5, color=MUTED, align="right"))
        yy += 110
    footer(els, 2); P_("02_agenda.page", els)

    # 3 problem ---------------------------------------------------------
    els, y = header("Unit I · Part 1 · Framing", "Manual counters left no record of anything")
    els += COLHEAD(M, 170, "The old desk")
    els += BUL(M, 208, [
        "Card catalogue, handwritten ledgers",
        "No traceability — who took what, when",
        "Fine disputes with no computed record",
        "Walk-in only; no reservation queue",
        "Shelf stock drifted from the register"], w=500, step=38)
    els.append(R(640, 170, 568, 322, PANEL))
    els.append(R(640, 170, 568, 5, BRASS))
    els += COLHEAD(664, 196, "CLMS answers")
    els += BUL(664, 234, [
        "Express 4 API| + React 18 / Vite 5 SPA",
        "JWT + bcryptjs| sessions, RBAC on routes",
        "Code 128 barcode| on every physical copy",
        "Stateful domain| holds, fines, renewals, queues"], w=520, step=40)
    els += BAR(522, "Initial dataset in v1: 2 staff · 4 members · 12 titles · 34 copies · 11 loans · 3 reservations · 2 penalties",
               font=MONO, size=12.5, h=44)
    footer(els, 3); P_("03_problem.page", els)

    # 4 stakeholders ------------------------------------------------------
    els, y = header("Unit I · Part 1 · Framing", "Four roles, one ledger, strict access boundaries")
    els.append(LEDGER(M, 178, 1136, 320, [0.15, 0.28, 0.57],
        ["ROLE", "POLICY ENVELOPE", "WHAT THEY DO ON THE DESK"],
        [["STUDENT", "14 d · 3 books · 3 holds", "Browse, borrow, place holds, view fines"],
         ["FACULTY", "30 d · 5 books · 5 holds", "Longer terms · first in hold queues"],
         ["LIBRARIAN", "Desk operations", "Issue, return, renewals, damage flags"],
         ["ADMIN", "Catalogue and policy control", "Members, titles, policy edits, oversight"]],
        mono_cols=(0,), size=13))
    els.append(T(M, 520, 1136, 40,
        "Every route checks the JWT role claim before its handler runs — RBAC is enforced in the backend, never hidden in the UI.",
        size=14, color=MUTED))
    els += BAR(572, "Two staff accounts and four member records are seeded — the same identities power the Selenium journeys in Unit III.", size=13)
    footer(els, 4); P_("04_stakeholders.page", els)

    # 5 SDLC --------------------------------------------------------------
    els, y = header("Unit I · Part 2 · Method", "Waterfall would have frozen rules we were still discovering")
    els.append(LEDGER(M, 178, 1136, 264, [0.20, 0.36, 0.44],
        ["DIMENSION", "WATERFALL", "HOW CLMS ACTUALLY RAN"],
        [["Requirements", "Signed off once, up front", "Evolved as 37 stories across 10 epics"],
         ["Feedback", "Only after full build-out", "Every two weeks at the sprint review"],
         ["Risk", "Late integration surprises", "Each sprint ran live on localhost:4000"],
         ["Fit for CLMS", "Weak — policies were unknown", "Lean + Scrum + Kanban + XP hybrid"]],
        mono_cols=(0,), size=13))
    els += BAR(468, "Agile fit confirmed: seven two-week sprints, 125 of 126 scope points delivered by 4 Sep 2026 — the process story is Unit II.", size=13)
    els.append(T(M, 546, 1136, 80,
        "Selection logic: policy values (terms, fines, queues) were interview material, not prior knowledge. An incremental lifecycle let each sprint correct the model before the next one built on it.",
        size=14, color=MUTED))
    footer(els, 5); P_("05_sdlc.page", els)

    # 6 requirements --------------------------------------------------------
    els, y = header("Unit I · Part 2 · Method", "Two kinds of requirements, two kinds of evidence")
    els += COLHEAD(M, 170, "Functional sample")
    els.append(LEDGER(M, 202, 540, 270, [0.20, 0.80],
        ["ID", "REQUIREMENT"],
        [["FR-01", "Borrow within the role's book limit"],
         ["FR-02", "Loan term ends at 23:59 on the due date"],
         ["FR-03", "Hold queue: FACULTY, then FIFO, then ID"],
         ["FR-04", "Fine 1 rupee/day; account block at 50"]],
        mono_cols=(0,), size=12.5))
    els += COLHEAD(644, 170, "Non-functional + how met")
    els.append(LEDGER(644, 202, 564, 270, [0.30, 0.70],
        ["NEED", "HOW IT IS MET"],
        [["Security", "JWT · bcryptjs hashes · RBAC guards"],
         ["Reliability", "Atomic tmp + rename JSON writes"],
         ["Portability", "Docker frontend, backend, compose"],
         ["Maintainability", "Five strict layers · avg CC 2.15"]], size=12.5))
    els.append(T(M, 508, 1136, 80,
        "Roughly 45 REST endpoints carry the functional side. The NFR table is the honest ledger — each need maps to a named mechanism in the code, not an aspiration.",
        size=14, color=MUTED))
    footer(els, 6); P_("06_requirements.page", els)

    # 7 traceability ---------------------------------------------------------
    els, y = header("Unit I · Part 2 · Method", "One line of vision, traceable down to every point")
    boxes = [("VISION", None, "One dependable collection desk"),
             ("EPICS", "10", "coarse scope units"),
             ("STORIES", "37", "sprint-sized promises"),
             ("POINTS", "126", "125 delivered")]
    bx, bw = M, 252; gap = 36
    for i, (lab, val, sub) in enumerate(boxes):
        x = bx + i * (bw + gap)
        els.append(R(x, 186, bw, 168, PANEL))
        els.append(R(x, 186, bw, 4, BRASS))
        els.append(T(x + 18, 200, bw - 36, 18, lab, size=11.5, color=BRASS, bold=True, ls=2, wrap=False))
        if val:
            els.append(T(x, 224, bw, 60, val, size=44, color=INK, font=DISPLAY, bold=True,
                         align="center", lh=1.0, wrap=False))
            els.append(T(x + 14, 296, bw - 28, 40, sub, size=12, color=MUTED, align="center"))
        else:
            els.append(T(x + 16, 236, bw - 32, 70, sub, size=16, color=INK, font=DISPLAY,
                         bold=True, italic=True, align="center", lh=1.25))
            els.append(T(x + 14, 312, bw - 28, 26, "the anchor sentence", size=12, color=MUTED,
                         align="center"))
        if i < 3:
            els += AROW([(x + bw + 4, 270), (x + bw + gap - 4, 270)], color=MUTED, th=2)
    els += BUL(M, 396, [
        "Every story| carries acceptance criteria and a sprint tag",
        "Epics| roll the stories back up to the vision sentence",
        "125 of 126| points delivered · US-37 deferred at review"], size=15, step=38, w=760)
    els.append(T(M, 540, 1136, 70,
        "Traceability worked both directions: defect RES-001 retraced to its hold-queue story, its epic, and its regression pin in one hop.",
        size=14, color=MUTED))
    footer(els, 7); P_("07_traceability.page", els)

    # 8 use case --------------------------------------------------------------
    els, y = header("Unit I · Part 3 · Modelling", "Use-case view: four actors, one shared catalogue")
    bx, by, bw2, bh2 = 300, 170, 838, 460
    els.append(R(bx, by, bw2, bh2, PAPER, border=INK, bw=2))
    els.append(T(bx + 16, by + 10, bw2 - 32, 20, "CLMS · COLLEGE LIBRARY MANAGEMENT SYSTEM",
                 size=11, color=INK, bold=True, ls=1.5, wrap=False))
    actors = [("STUDENT", 226), ("FACULTY", 322), ("LIBRARIAN", 418), ("ADMIN", 512)]
    for lab, ay in actors:
        els += CHIP(80, ay, 160, 40, lab, fill=INK, size=12)
        els += AROW([(240, ay + 20), (bx, ay + 20)], color=MUTED, th=1, hlen=11)
    cases = [(360, 196, "Browse the catalogue"), (690, 196, "Borrow a book"),
             (360, 300, "Reserve a copy"),      (690, 300, "Fines & receipt view"),
             (360, 404, "Issue / return stock"), (690, 404, "Manage titles & members")]
    for cx, cy, lab in cases:
        els.append(R(cx, cy, 250, 52, PANEL, shape="ellipse", border=BRASS, bw=2))
        els.append(T(cx, cy, 250, 52, lab, size=13, color=INK, bold=True,
                     align="center", valign="middle", wrap=False))
    els.append(R(525, 520, 250, 52, "#F3EBD9", shape="ellipse", border=BRASS, bw=2))
    els.append(T(525, 520, 250, 52, "Check limits & dues", size=13, color=INK, bold=True,
                 align="center", valign="middle", wrap=False))
    els += AROW([(940, 222), (1114, 222), (1114, 546), (775, 546)], color=BRASS, th=1, hlen=11)
    els.append(T(952, 202, 150, 18, "«include»", size=10.5, color=BRASS, italic=True,
                 font=MONO, wrap=False))
    els += AROW([(485, 356), (485, 546), (525, 546)], color=BRASS, th=1, hlen=11)
    els.append(T(492, 424, 150, 18, "«include»", size=10.5, color=BRASS, italic=True,
                 font=MONO, wrap=False))
    els.append(T(M, 636, 1136, 24, "Reserve a copy and Borrow a book share one guard — limits, dues and status resolve in the pure domain layer.",
                 size=12.5, color=MUTED))
    footer(els, 8); P_("08_usecase.page", els)

    # 9 class model ------------------------------------------------------------
    els, y = header("Unit I · Part 3 · Modelling", "Eight entities carry the whole domain")
    ent_a = [["Account", "id · email · bcrypt hash · role"],
             ["Member", "memberCode · type · status"],
             ["Title", "isbn · title · author · edition"],
             ["Copy", "copyId (LIB-...) · status · shelf"]]
    ent_b = [["Loan", "issuedAt · dueAt 23:59 · renewals x2 max"],
             ["Reservation", "queue position · 48 h pick-up window"],
             ["Penalty", "1 rupee/day accrual · 50-rupee block"],
             ["Policy", "term and limits per role (seeded)"]]
    els.append(LEDGER(M, 186, 548, 250, [0.28, 0.72], ["ENTITY", "KEY FIELDS"], ent_a, mono_cols=(1,), size=12))
    els.append(LEDGER(660, 186, 548, 250, [0.28, 0.72], ["ENTITY", "KEY FIELDS"], ent_b, mono_cols=(1,), size=12))
    els.append(T(M, 466, 1136, 80,
        "Copy owns the state machine of the next slide. Loan and Reservation reference Member, Title and Copy by id — BinaryStore persists each collection as one opaque .cdb binary file, and joins happen in the domain layer.",
        size=14, color=MUTED))
    els += BAR(560, "Relation map: Account 1:1 Member · Title 1:N Copy · Member 1:N Loan / Reservation / Penalty · Policy read by every guard",
               font=MONO, size=12.5, h=44)
    footer(els, 9); P_("09_classes.page", els)

    # 10 state machine ------------------------------------------------------------
    els, y = header("Unit I · Part 3 · Modelling", "A copy is only ever in one of six states")
    A, I, RS, DM, MT, LO = (520, 360), (860, 360), (860, 204), (520, 204), (150, 204), (150, 520)
    for (x0, y0), lab, col in [(A, "AVAILABLE", INK), (I, "ISSUED", INK2), (RS, "RESERVED", INK2),
                               (DM, "DAMAGED", BRASS), (MT, "MAINTENANCE", BRASS), (LO, "LOST", BRICK)]:
        els += CHIP(x0, y0, 176, 52, lab, fill=col, size=12.5)
    def mid(x, yy, s, w=140, col=MUTED):
        els.append(T(x, yy, w, 16, s, size=10.5, color=col, font=MONO, wrap=False))
    els += AROW([(696, 372), (860, 372)], color=INK, th=2);  mid(716, 352, "issue · 14/30 d")
    els += AROW([(860, 396), (696, 396)], color=INK, th=2);  mid(716, 402, "return · fine")
    els += AROW([(608, 360), (608, 262)], color=INK, th=2);  mid(438, 300, "mark damaged")
    els += AROW([(520, 230), (332, 230)], color=BRASS, th=2); mid(366, 238, "repair")
    els += AROW([(238, 256), (238, 386), (520, 386)], color=BRASS, th=2); mid(250, 324, "back on shelf")
    els += AROW([(660, 360), (660, 286), (760, 286), (760, 230), (860, 230)],
                color=INK, th=2); mid(770, 266, "hold placed · 48 h", w=200)
    els += AROW([(948, 256), (948, 360)], color=INK2, th=2); mid(958, 300, "READY · collect", w=170)
    els += AROW([(520, 412), (238, 412), (238, 520)], color=BRICK, th=2); mid(248, 448, "reported lost", w=200)
    els.append(R(1062, 360, 146, 52, PANEL, border=BRASS, bw=2, shape="ellipse"))
    els.append(T(1062, 360, 146, 52, "cancel READY", size=10.5, color=INK, align="center",
                 valign="middle", font=MONO))
    els += AROW([(1135, 360), (1135, 243), (1036, 243)], color=BRICK, th=1, hlen=11)
    mid(1042, 182, "re-dispatch RES-001", w=166, col=BRICK)
    els += BAR(606, "RES-001 guard: a cancelled READY hold snapshots its pre-state and re-dispatches to the next queue member — no copy is ever stranded.",
               size=12.5, h=44)
    footer(els, 10); P_("10_states.page", els)

    # 11 sequence -------------------------------------------------------------
    els, y = header("Unit I · Part 3 · Modelling", "Issue-at-desk: seven messages, one atomic write")
    lanes = [("LIBRARIAN", 170), ("REACT UI", 460), ("DOMAIN (EXPRESS)", 760), ("JSONSTORE", 1050)]
    for lab, cx in lanes:
        els += CHIP(cx - 95, 162, 190, 40, lab, fill=INK, size=10.5)
        els.append(VL(cx, 216, 414, LINEC, 2))
    def msg(y_, fromx, tox, label):
        els.extend(AROW([(fromx, y_), (tox, y_)], color=INK, th=2))
        els.append(T(min(fromx, tox) + 8, y_ - 24, abs(tox - fromx) - 16, 18, label,
                     size=11.5, color=BRASS, font=MONO, align="center", wrap=False))
    def note(x, y_, w, label):
        els.append(R(x, y_, w, 38, PANEL, border=MUTED, bw=1))
        els.append(T(x + 8, y_, w - 16, 38, label, size=10.5, color=INK, font=MONO,
                     valign="middle", align="center", wrap=False))
    msg(262, 170, 460, "1 · scan barcode LIB-CSALG01-001")
    msg(326, 460, 760, "2 · POST /api/loans · JWT LIBRARIAN")
    note(656, 350, 210, "3 · guard: status · limit · dues")
    msg(440, 760, 1050, "4 · write loan · flip copy state")
    note(946, 462, 210, "5 · tmp file, then atomic rename")
    msg(552, 760, 460, "6 · 201 · loan + receipt payload")
    msg(610, 460, 170, "7 · print receipt · Code 128")
    els.append(T(M, 640, 1136, 24, "No step trusts the browser: the guard runs server-side even though the UI already disables invalid actions.",
                 size=12.5, color=MUTED))
    footer(els, 11); P_("11_sequence.page", els)

    # 12 architecture ----------------------------------------------------------
    els, y = header("Unit I · Part 4 · Architecture", "Five strict layers, one atomic store")
    els += CHIP(M, 166, 620, 38, "React 18 + Vite 5 SPA · REST · Express 4 on :4000",
                fill=PANEL, tcolor=INK, size=12.5, body_font=True)
    layers = [("routes", "JWT + RBAC guard ahead of every endpoint"),
              ("services", "orchestration only — no business rules"),
              ("domain", "pure functions: policies, state, fines"),
              ("repositories", "one accessor per entity collection"),
              ("BinaryStore", ".cdb container · tmp+rename · CRC32-checked")]
    yy = 220
    for i, (lab, note_) in enumerate(layers):
        fill = INK if i != 4 else BRASS
        els.append(R(M, yy, 560, 58, fill))
        els.append(T(M + 22, yy, 520, 58, lab, size=16, color=WHITE, font=MONO, bold=True,
                     valign="middle", wrap=False))
        els.append(T(672, yy + 8, 540, 20, "L%d · %s" % (i + 1, lab.upper()), size=11,
                     color=BRASS, bold=True, ls=1.5, wrap=False))
        els.append(T(672, yy + 30, 540, 26, note_, size=12.5, color=MUTED, wrap=False))
        if i < 4:
            els += AROW([(350, yy + 58), (350, yy + 70)], color=MUTED, th=2, hlen=11)
        yy += 70
    els += BAR(580, "Binary .cdb files in local storage instead of Postgres — atomic, CRC32-guarded persistence", size=13)
    els.append(T(M, 646, 1136, 16, "System scale: 29 source files · 1,585 LOC · 321 functions · ~45 REST endpoints",
                 size=11.5, color=MUTED, font=MONO))
    footer(els, 12); P_("12_architecture.page", els)

    # 13 barcode ------------------------------------------------------------------
    els, y = header("Unit I · Part 4 · Architecture", "Every copy carries a scannable identity")
    els.append(R(M, 176, 520, 330, WHITE, border=LINEC, bw=1))
    els.append(T(M + 24, 196, 470, 20, "CATALOGUE COPY · SAMPLE LABEL", size=11, color=BRASS,
                 bold=True, ls=1.8, wrap=False))
    els.append(T(M + 24, 222, 470, 34, "LIB-CSALG01-001", size=24, color=INK, font=MONO,
                 bold=True, wrap=False))
    els.append(IMG(M + 34, 268, 452, 188, "media/barcode-motif.png"))
    els += COLHEAD(640, 176, "Why Code 128 · via bwip-js")
    els += BUL(640, 212, [
        "Dense full-ASCII| — codes fit small spine labels",
        "Built-in check digit| — misreads reject themselves",
        "Scanner-agnostic| — camera or gun, same string",
        "Server-side SVG| — generated on demand by bwip-js"], w=560, step=40)
    els += BAR(534, "UI-002 lesson: an image tag cannot send a JWT header — the SPA fetches the SVG authenticated, then paints it.",
               size=12.5, h=44, fill=BRICK)
    els.append(T(M, 596, 1136, 30, "Label format LIB-<collection><item>-<seq>: human-readable prefix, machine-scannable payload.",
                 size=12.5, color=MUTED))
    footer(els, 13); P_("13_barcode.page", els)

    # 14 data stats ----------------------------------------------------------------
    els, y = header("Unit I · Part 4 · Architecture", "The whole system fits in seven small files")
    stats = [("2", "SEED STAFF"), ("4", "SEED MEMBERS"), ("12", "TITLES"), ("34", "PHYSICAL COPIES")]
    xs = [M, 362, 652, 942]
    for i, (n, lab) in enumerate(stats):
        els += STAT(xs[i], 192, n, lab, numsize=62)
        if i < 3: els.append(VL(xs[i + 1] - 40, 198, 96, LINEC, 2))
    stats2 = [("11", "OPEN LOANS"), ("3", "RESERVATIONS"), ("2", "PENALTIES")]
    for i, (n, lab) in enumerate(stats2):
        els += STAT(xs[i], 358, n, lab, numsize=62, numcolor=BRASS)
        if i < 2: els.append(VL(xs[i + 1] - 40, 364, 96, LINEC, 2))
    els.append(T(942, 358, 266, 100, "One JSON collection per entity — no database server anywhere in the stack.",
                 size=14, color=MUTED))
    els += BAR(512, "Trade-off stated honestly: JSON documents were an explicit requirement — the answer is atomic tmp + rename writes, so a crash mid-save cannot corrupt the ledger.",
               size=12.5, h=58)
    footer(els, 14); P_("14_data.page", els)

    # 15 principles -----------------------------------------------------------------
    els, y = header("Unit I · Part 4 · Architecture", "Design principles that earned their keep")
    items = [("Single responsibility by layering",
              "Routes never touch files; the store never knows library rules — each rule lives in exactly one place."),
             ("Pure domain functions",
              "Policies evaluate without I/O or mocks — which is why domain statement coverage reaches 96.8%."),
             ("Idempotent notifications",
              "A READY notice replayed is harmless — queue re-dispatch stays safe after the RES-001 fix."),
             ("State guards before writes",
              "Every copy transition checks the allowed set first — no silent illegal edit reaches the store.")]
    yy = 180
    for i, (t, ev) in enumerate(items):
        els.append(T(M, yy, 70, 32, "P%d" % (i + 1), size=15, color=BRASS, font=MONO, bold=True, wrap=False))
        els.append(T(M + 62, yy - 3, 1074, 30, t, size=20, color=INK, font=DISPLAY, bold=True, wrap=False))
        els.append(T(M + 62, yy + 30, 1074, 42, ev, size=14, color=MUTED))
        els.append(HL(M, yy + 86, 1136))
        yy += 112
    footer(els, 15); P_("15_principles.page", els)

    # 16 recap ------------------------------------------------------------------------
    els, y = header("Unit I · Recap", "Unit I in four lines")
    lines = ["The problem was paper: no traceability, no queues, no computed fines.",
             "Modelled first: use cases, 8 entities, a 6-state copy, a 7-message issue flow.",
             "Architecture: five strict layers over an atomic JSON store, barcoded end to end.",
             "The principles proved themselves in defects — every fix had exactly one home."]
    yy = 186
    for i, ln in enumerate(lines):
        els.append(T(M, yy, 64, 30, "0%d" % (i + 1), size=16, color=BRASS, font=MONO, bold=True, wrap=False))
        els.append(T(M + 62, yy - 3, 1074, 56, ln, size=18, color=INK, font=DISPLAY))
        yy += 66
    recap_tail(els, "Design lesson: library policy belongs in code, not in counter habit.",
               "Next · Unit II — the Agile practices and project management that turned this design into seven shipped sprints.",
               16)
    P_("16_recap.page", els)

    write_deck(d, "CLMS Unit I — SE Fundamentals & System Design", names)
    return names

if __name__ == "__main__":
    print("unit-1 pages:", len(build()))
