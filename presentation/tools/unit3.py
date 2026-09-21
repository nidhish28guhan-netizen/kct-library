#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Unit III — Testing, Quality & DevOps (16 slides)."""
import os
from deckkit import *

def build():
    d = unit_dir("unit-3")
    chart_pyramid(os.path.join(d, "media", "pyramid.png"))
    names = []
    def P_(name, els, pt="content"):
        write_page(d, name, els, pt); names.append(name)

    # 1 cover -----------------------------------------------------------
    P_("01_cover.page", cover("III", ["Testing, Quality", "& DevOps"],
        "123 tests, 82% coverage and two Selenium journeys — the evidence behind v1.0.0.",
        "deck 3 / 3"), "cover")

    # 2 agenda ----------------------------------------------------------
    els, y = header("Agenda · Unit III", "What this unit covers")
    parts = [("01", "STRATEGY", "The test pyramid · the TDD loop we actually ran"),
             ("02", "BLACK-BOX TECHNIQUES", "Equivalence partitioning · boundary values · decision tables"),
             ("03", "EVIDENCE", "Selenium journeys · defect ledger · coverage · white-box metrics"),
             ("04", "QUALITY SYSTEM", "ISO 25010 · CI/CD · CMMI-3 · the v1.0.0 release ledger")]
    yy = 190
    for num, t, topics in parts:
        els.append(HL(M, yy - 16, 1136))
        els.append(T(M, yy, 70, 30, num, size=17, color=BRASS, font=MONO, bold=True, wrap=False))
        els.append(T(M + 92, yy - 3, 600, 34, t, size=21, color=INK, font=DISPLAY, bold=True, wrap=False))
        els.append(T(620, yy + 2, 588, 28, topics, size=14.5, color=MUTED, align="right"))
        yy += 110
    footer(els, 2); P_("02_agenda.page", els)

    # 3 pyramid -----------------------------------------------------------
    els, y = header("Unit III · Part 1 · Strategy", "A pyramid, not a coin flip: 123 tests in six suites")
    els.append(IMG(M, 172, 560, 360, "media/pyramid.png"))
    els.append(T(M, 540, 560, 20, "Figure: test pyramid — counts as shipped at v1.0.0.",
                 size=11.5, color=MUTED, font=MONO))
    for i, (n, lab, sub) in enumerate([("123", "AUTOMATED TESTS", "all passing"),
                                       ("6", "JEST SUITES", "domain · repos · routes · services"),
                                       ("2", "E2E JOURNEYS", "Selenium headless Chrome")]):
        els += STAT(700, 186 + i * 128, n, lab, sub=sub, numsize=52, w=440,
                    numcolor=(BRASS if i == 2 else INK))
        if i: els.append(HL(700, 174 + i * 128, 440))
    els.append(T(700, 566, 508, 60, "The split is the strategy: fast specs hold the rules; two slow journeys guard the wiring end to end.",
                 size=13.5, color=MUTED, lh=1.3))
    footer(els, 3); P_("03_pyramid.page", els)

    # 4 TDD ---------------------------------------------------------------
    els, y = header("Unit III · Part 1 · Strategy", "TDD was real here — the due-date rule is the proof")
    steps = [("RED", "write the failing spec first", BRICK),
             ("GREEN", "minimum change to pass", INK),
             ("REFACTOR", "clean up under coverage floor", INK2)]
    for i, (t, s2, col) in enumerate(steps):
        x = M + i * 210
        els += CHIP(x, 192, 170, 56, t, fill=col, size=15, body_font=True)
        els.append(T(x, 258, 180, 20, s2, size=11.5, color=MUTED))
        if i < 2:
            els += AROW([(x + 174, 220), (x + 208, 220)], color=MUTED, th=2)
    els += AROW([(577, 192), (577, 158), (157, 158), (157, 192)],
                color=MUTED, th=1, hlen=11)
    els.append(T(M + 300, 134, 260, 18, "loop, per story", size=11, color=MUTED, font=MONO, wrap=False))
    els += BAR(300, "The story: a loan term must end at 23:59, not midnight.", fill=INK, size=14, h=44)
    lines = [("RED", "a spec asserted 'due at 23:59:59 on the last day' — it failed against a 00:00 parse."),
             ("GREEN", "the due-date computation moved to 23:59 in the pure domain layer; suite went green."),
             ("PIN", "boundary tests at ±1 day now guard the rule — nobody re-breaks it silently.")]
    yy = 372
    for tag, body in lines:
        els.append(T(M, yy, 110, 22, tag, size=12, color=BRASS, font=MONO, bold=True, wrap=False))
        els.append(T(M + 116, yy - 1, 1020, 44, body, size=15, color=INK, lh=1.2))
        yy += 56
    footer(els, 4); P_("04_tdd.page", els)

    # 5 EP ------------------------------------------------------------------
    els, y = header("Unit III · Part 2 · Black-box techniques", "Equivalence partitioning: test classes, not incidents")
    els.append(LEDGER(M, 178, 1136, 300, [0.30, 0.34, 0.36],
        ["PARTITION · BORROWER ID", "MEMBER OF CLASS", "EXPECTED OUTCOME"],
        [["valid active STUDENT", "under 3 books on loan", "issue allowed · 14-day term"],
         ["valid active FACULTY", "under 5 books on loan", "issue allowed · 30-day term"],
         ["unknown member code", "no matching record", "rejected — 404-class guard"],
         ["valid ID, blocked account", "dues at or above 50 rupees", "rejected — block guard"]],
        mono_cols=(0,), size=12.5))
    els += BUL(M, 512, [
        "One representative per partition| — the rest of the class adds no information",
        "Partitions came from the FR table|, not from imagination",
        "Every guard is a domain function|— so the specs need no mocks"], w=1100, step=40, size=14.5)
    footer(els, 5); P_("05_ep.page", els)

    # 6 BVA --------------------------------------------------------------------
    els, y = header("Unit III · Part 2 · Black-box techniques", "Boundary values: policy lives on the edges")
    els.append(LEDGER(M, 178, 700, 348, [0.42, 0.30, 0.28],
        ["BOUNDARY TESTED", "VALUE", "OUTCOME"],
        [["renewals count", "1st renewal (of 2)", "allowed"],
         ["renewals count", "2nd renewal — last one", "allowed"],
         ["renewals count", "3rd renewal — over max", "refused"],
         ["due date", "returned on due day, 23:59", "0 rupees fine"],
         ["due date", "returned 1 day late", "1 rupee accrued"],
         ["fine ceiling", "accrual reaching 50 rupees", "account blocked"]],
        size=12.5))
    els += COLHEAD(800, 186, "Why edges over middle")
    els += BUL(800, 222, [
        "Off-by-one lurks|: 00:00 vs 23:59 — a real RED",
        "2 vs 3 renewals| — the exact policy line per role",
        "Reaches 50, passes 50| — block fires once"], w=408, step=64, size=13.5)
    els.append(T(M, 548, 1136, 40, "These pins are the 'preventive maintenance' evidence on the CMMI slide — BVA tests pre-empt whole defect families.",
                 size=13.5, color=MUTED))
    footer(els, 6); P_("06_bva.page", els)

    # 7 decision table ------------------------------------------------------------
    els, y = header("Unit III · Part 2 · Black-box techniques", "One decision table owns the can-issue question")
    rows = [HDR(["RULE", "MEMBER STATUS", "UNDER LIMIT", "DUES BELOW 50", "COPY AVAILABLE", "ISSUE?"]) ]
    dt = [["R1", "ACTIVE", "Y", "Y", "Y", "ALLOW"],
          ["R2", "ACTIVE", "N", "Y", "Y", "REFUSE · LIMIT"],
          ["R3", "ACTIVE", "Y", "N", "Y", "REFUSE · BLOCK"],
          ["R4", "BLOCKED", "—", "—", "Y", "REFUSE · STATUS"],
          ["R5", "ACTIVE", "Y", "Y", "N (on hold)", "REFUSE · QUEUE"]]
    for ri, r in enumerate(dt):
        fill = PAPER if ri % 2 == 0 else PANEL2
        ok = r[-1] == "ALLOW"
        rows.append([{"text": v, "fill": fill, "bold": ci in (0, 5),
                      "font": MONO if ci in (1, 2, 3, 4, 5) else BODY,
                      "size": 12, "h": "center" if 0 < ci < 5 else "left",
                      "color": (INK2 if ok and ci == 5 else (BRICK if ci == 5 else INK))}
                     for ci, v in enumerate(r)])
    els.append(TBL(M, 180, 1136, 260, [0.10, 0.19, 0.16, 0.19, 0.19, 0.17], rows))
    els += BUL(M, 478, [
        "Five rules, each a one-line spec|in the domain test suite",
        "The dashes are real|— blocked members never reach the dues check",
        "R5 encodes the hold queue|— the reserved copy waits for READY, not for whoever asks"], w=1100, step=40, size=14.5)
    footer(els, 7); P_("07_decision.page", els)

    # 8 selenium ---------------------------------------------------------------------
    els, y = header("Unit III · Part 3 · Evidence", "Two Selenium journeys, five steps each, asserted via API")
    cards = [("JOURNEY 1 · STUDENT", INK,
              ["1  log in on the SPA (JWT)", "2  search catalogue · pick a copy",
               "3  place a hold on the ISSUED copy", "4  copy returns → member is READY",
               "5  fines view shows 7 rupees accrued"]),
             ("JOURNEY 2 · LIBRARIAN", BRASS,
              ["1  log in at the desk (JWT)", "2  scan LIB-CSALG01-001 Code 128",
               "3  issue loan → state flips to ISSUED", "4  receipt + barcode verified",
               "5  return → API asserts AVAILABLE + fine"])]
    for i, (t, col, steps) in enumerate(cards):
        x = M + i * 596
        els.append(R(x, 180, 540, 350, PANEL))
        els.append(R(x, 180, 540, 6, col))
        els.append(T(x + 24, 200, 492, 24, t, size=13.5, color=col, bold=True, ls=1.6, wrap=False))
        for j, s2 in enumerate(steps):
            els.append(T(x + 24, 238 + j * 44, 492, 30, s2, size=14, color=INK, wrap=False))
            els.append(HL(x + 24, 236 + j * 44, 492))
        els.append(HL(x + 24, 470, 492, LINEC, 1))
        els.append(T(x + 24, 478, 492, 34, "headless Chrome · 5 steps · passing at v1.0.0",
                     size=11.5, color=MUTED, font=MONO))
    els += BAR(558, "No screenshot theatre: post-return state is verified through REST responses, not DOM pixels.", size=13, h=44)
    footer(els, 8); P_("08_selenium.page", els)

    # 9 defects ------------------------------------------------------------------------
    els, y = header("Unit III · Part 3 · Evidence", "Three defects found, three durable fixes")
    els += COLHEAD(M, 178, "RES-001 · the one worth telling")
    steps = [("FOUND", "S3 review", "cancelled READY hold could strand a copy"),
             ("ROOT CAUSE", "state model", "queue re-dispatch happened only on happy-path return"),
             ("FIX", "domain", "snapshot pre-state · redispatch to next queue member"),
             ("PIN", "regression", "a spec now replays the cancel path every CI run")]
    yy = 212
    for i, (tag, where, body) in enumerate(steps):
        els.append(R(M, yy, 160, 46, INK if i < 3 else BRASS))
        els.append(T(M, yy, 160, 46, tag, size=12, color=WHITE, font=MONO, bold=True,
                     align="center", valign="middle", wrap=False))
        els.append(T(M + 176, yy + 3, 280, 20, where.upper(), size=11, color=BRASS, bold=True, ls=1.2, wrap=False))
        els.append(T(M + 176, yy + 22, 540, 24, body, size=13, color=INK, wrap=False))
        if i < 3:
            els += AROW([(152, yy + 46), (152, yy + 62)], color=MUTED, th=1, hlen=9)
        yy += 62
    els.append(R(796, 212, 3, 250, LINEC))
    cards = [("UI-002", "Sprint 6", "Image tags cannot send JWT for the barcode SVG.",
              "Authenticated fetch, then paint the SVG from memory."),
             ("E2E-003", "Test flake", "Autofocus login selector raced page render.",
              "Explicit selectors rule written into the Definition of Done.")]
    for i, (dc, sprint, bad, good) in enumerate(cards):
        cy = 212 + i * 132
        els.append(R(820, cy, 388, 118, PANEL))
        els.append(R(820, cy, 388, 5, BRASS))
        els.append(T(840, cy + 14, 348, 22, "%s · %s" % (dc, sprint), size=13, color=INK,
                     font=MONO, bold=True, wrap=False))
        els.append(T(840, cy + 42, 348, 24, "Symptom — " + bad, size=12, color=MUTED, wrap=False))
        els.append(T(840, cy + 66, 348, 44, "Fix — " + good, size=12, color=INK, lh=1.2))
    els += BAR(586, "Each defect left the codebase stronger than it was before it was found.", size=13, h=42)
    footer(els, 9); P_("09_defects.page", els)

    # 10 coverage ------------------------------------------------------------------------
    els, y = header("Unit III · Part 3 · Evidence", "Statement coverage by layer — with the miss disclosed")
    rows = [("domain", 96.8, True), ("repositories", 97.1, True),
            ("routes", 85.4, True), ("services", 73.9, False)]
    track_x, track_w = 250, 520
    yy = 196
    for name, v, ok in rows:
        els.append(T(M, yy + 4, 170, 24, name, size=15, color=INK, font=MONO, bold=True, wrap=False))
        els.append(R(track_x, yy, track_w, 26, "#EBE5D6"))
        els.append(R(track_x, yy, track_w * v / 100.0, 26, INK2 if ok else BRASS))
        els.append(T(track_x + track_w + 18, yy + 3, 130, 24, "%.1f%%" % v, size=15,
                     color=INK2 if ok else BRASS, font=MONO, bold=True, wrap=False))
        yy += 48
    els.append(VL(track_x + track_w * 0.8, 188, 200, BRASS, 2))
    els.append(T(track_x + track_w * 0.8 - 70, 168, 140, 20, "target 80%", size=11, color=BRASS,
                 bold=True, font=MONO, align="center", wrap=False))
    els.append(HL(M, 412, 880))
    els.append(T(M, 424, 880, 24, "all files: 82.0% stmts · 88.1% lines", size=14, color=INK, font=MONO))
    els += BUL(M, 464, [
        "Blueprint rule met|: three core modules clear the 80% target",
        "Services sit at 73.9%|— thin glue; assertions live in domain specs",
        "Coverage is a floor|: enforced in CI, discussed in retrospectives"], w=880, step=38)
    els.append(R(960, 196, 248, 240, PANEL))
    els.append(R(960, 196, 248, 5, BRASS))
    els.append(T(978, 214, 212, 20, "MEASURED", size=11, color=BRASS, bold=True, ls=1.6, wrap=False))
    els += STAT(978, 244, "123", "TESTS PASSING", numsize=34, w=212)
    els.append(HL(978, 330, 212))
    els += STAT(978, 344, "6", "SUITES", numsize=34, w=212, numcolor=BRASS)
    footer(els, 10); P_("10_coverage.page", els)

    # 11 whitebox ----------------------------------------------------------------------------
    els, y = header("Unit III · Part 3 · Evidence", "White-box: complexity kept in a ledger")
    els += STAT(M, 190, "2.15", "AVERAGE MCCABE CC", sub="across the backend", numsize=64, w=420)
    els += STAT(M, 348, "14", "MAXIMUM CC — ONE OUTLIER", numsize=64, numcolor=BRASS, w=420,
                sub="the hold-redispatch branch from RES-001")
    els.append(VL(560, 196, 240, LINEC, 2))
    els += BUL(600, 200, [
        "Average CC 2.15| — guards stay linear by design",
        "Peak 14 is deliberate| — redispatch is branchy, pinned by tests",
        "Halstead effort N × log2 n| — a review smell meter, not a gate"], w=608, step=66, size=14)
    els += BAR(500, "Low average complexity is what let a two-person team hold 1,585 LOC and 321 functions in their heads.", size=13, h=44)
    footer(els, 11); P_("11_whitebox.page", els)

    # 12 ISO 25010 ------------------------------------------------------------------------------
    els, y = header("Unit III · Part 4 · Quality system", "ISO 25010: eight characteristics, eight pieces of evidence")
    iso_a = [["Functional suitability", "123 tests · 6 suites · all passing"],
             ["Reliability", "atomic store · state-machine guards"],
             ["Security", "JWT · bcryptjs · RBAC on routes"],
             ["Usability", "keyboard-reachable · reduced-motion"]]
    iso_b = [["Maintainability", "layering · avg CC 2.15 · coverage floor"],
             ["Portability", "Docker images · compose stack"],
             ["Transferability", "seed data + policy documentation"],
             ["Performance efficiency", "in-process JSON reads · single instance"]]
    els.append(LEDGER(M, 186, 548, 290, [0.38, 0.62], ["CHARACTERISTIC", "EVIDENCE IN v1.0.0"], iso_a, size=12.5))
    els.append(LEDGER(660, 186, 548, 290, [0.38, 0.62], ["CHARACTERISTIC", "EVIDENCE IN v1.0.0"], iso_b, size=12.5))
    els.append(T(M, 506, 1136, 60, "Assessment discipline: a characteristic counts as met only when a shipped artifact proves it — tests, code structure, container files or documented data.",
                 size=14, color=MUTED))
    els += BAR(568, "Nothing claimed without a trace: each row above points at a file, a suite or a configuration that exists in the repo.",
               size=13, h=44)
    footer(els, 12); P_("12_iso.page", els)

    # 13 CI/CD -------------------------------------------------------------------------------------
    els, y = header("Unit III · Part 4 · Quality system", "CI is the referee: lint, jest, coverage, build, ship")
    stages = ["install", "lint", "jest", "coverage", "vite build", "docker"]
    x = M
    for i, s2 in enumerate(stages):
        last = i == len(stages) - 1
        els.append(R(x, 200, 156, 62, BRASS if last else INK, shape="chevron"))
        els.append(T(x + 18, 200, 132, 62, s2, size=13, color=WHITE, font=MONO, bold=True,
                     align="center", valign="middle", wrap=False))
        x += 166
    els.append(T(M, 288, 1136, 20, "GITHUB ACTIONS · EVERY PUSH AND PULL REQUEST", size=11,
                 color=MUTED, bold=True, ls=1.5, wrap=False))
    els += BUL(M, 328, [
        "jest + coverage + vite build|run in one workflow file",
        "Workflow paths fixed early|— the YAML lives at the repo root",
        "Coverage floor enforced in CI|, so a drop fails the build, not a review"], w=1100, step=40)
    cards = [("FRONTEND IMAGE", "multi-stage: build with node, serve static — slim final layer"),
             ("BACKEND IMAGE", "slim node runtime for the Express 4 API"),
             ("COMPOSE", "frontend + backend + shared data volume, one command up")]
    for i, (t, b) in enumerate(cards):
        x2 = M + i * 384
        els.append(R(x2, 470, 356, 130, PANEL))
        els.append(R(x2, 470, 356, 5, BRASS))
        els.append(T(x2 + 22, 488, 312, 22, t, size=12.5, color=BRASS, bold=True, font=MONO, wrap=False))
        els.append(T(x2 + 22, 516, 312, 70, b, size=13, color=INK, lh=1.3))
    footer(els, 13); P_("13_cicd.page", els)

    # 14 CMMI + maintenance ---------------------------------------------------------------------------
    els, y = header("Unit III · Part 4 · Quality system", "CMMI-3 habits, and four flavours of maintenance")
    els += COLHEAD(M, 176, "CMMI level-3 practices as run")
    els.append(LEDGER(M, 206, 1136, 208, [0.30, 0.70],
        ["PRACTICE AREA", "HOW v1.0.0 MET IT"],
        [["Organizational Process Focus", "cadence reused across all 7 sprints"],
         ["Project Planning (PP)", "WBS + poker estimates + capacity check"],
         ("Project Monitoring & Control", "velocity vs plan; slips recovered fast"),
         ["Measurement & Analysis", "coverage, CC, velocity as metrics"],
         ["Peer Reviews", "cross-review inside Definition of Done"]],
        size=12.5))
    els += COLHEAD(M, 442, "Maintenance types — each already happened")
    cards = [("CORRECTIVE", "RES-001 hold stranding", BRICK),
             ("ADAPTIVE", "policy term changes absorbed", BRASS),
             ("PERFECTIVE", "recommendation reasons added", INK2),
             ("PREVENTIVE", "BVA pins block defect families", INK)]
    for i, (t, b, col) in enumerate(cards):
        x = M + i * 288
        els.append(R(x, 474, 268, 124, PANEL))
        els.append(R(x, 474, 268, 6, col))
        els.append(T(x + 20, 492, 228, 24, t, size=13, color=col, bold=True, font=MONO, wrap=False))
        els.append(T(x + 20, 522, 228, 60, b, size=13, color=INK, lh=1.3))
    footer(els, 14); P_("14_cmmi.page", els)

    # 15 release ---------------------------------------------------------------------------------------
    els, y = header("Unit III · Part 4 · Quality system", "Release ledger: v1.0.0 · 4 Sep 2026")
    els.append(R(M, 178, 1136, 118, INK))
    els.append(T(M + 34, 196, 500, 82, "v1.0.0", size=54, color=WHITE, font=DISPLAY, bold=True, wrap=False))
    els.append(T(560, 196, 380, 30, "SHIPPED 4 SEP 2026", size=13, color=PALEBRASS, bold=True, ls=2, wrap=False))
    els.append(T(560, 230, 620, 50, "10 epics · 37 stories · 125 of 126 points · all seven sprints closed",
                 size=15, color=WHITE, lh=1.3))
    els += BUL(M, 332, [
        "Delivered|: catalogue, circulation, holds queue, fines, barcodes, RBAC desks, React SPA, Docker stack",
        "Quality at the gate|: 123 tests green · 82.4% stmts / 88.8% lines · 2 E2E journeys passing"], w=1100, step=58, size=15)
    els += COLHEAD(M, 458, "Known limits, on the record")
    els += BUL(M, 490, [
        "US-37 deferred|— the one point that did not make the date",
        "Single instance, JSON store|— a requirement trade-off, made crash-safe",
        "Services at 73.9% stmts|— thin glue, asserted where it matters"], w=1100, step=40, size=14.5)
    footer(els, 15); P_("15_release.page", els)

    # 16 recap + thanks -----------------------------------------------------------------------------------
    els, y = header("Unit III · Recap", "Quality was designed in, not tested on at the end")
    lines = ["Pyramid economics: fast specs hold the rules, two journeys guard the wiring.",
             "EP, BVA and decision tables turned policy into a testable contract.",
             "Coverage, CC and ISO evidence were measured, published — misses included.",
             "CI, Docker and CMMI-3 habits made v1.0.0 repeatable, not lucky."]
    yy = 184
    for i, ln in enumerate(lines):
        els.append(T(M, yy, 64, 30, "0%d" % (i + 1), size=16, color=BRASS, font=MONO, bold=True, wrap=False))
        els.append(T(M + 62, yy - 3, 1074, 56, ln, size=18, color=INK, font=DISPLAY))
        yy += 62
    els.append(HL(M, 446, 1136))
    els.append(T(M, 462, 700, 44, "Thank you — questions welcome.", size=28, color=INK,
                 font=DISPLAY, bold=True, wrap=False))
    els += CHIP(M, 522, 330, 44, "Delivered v1.0.0 · 4 Sep 2026", fill=INK, size=13, body_font=True)
    els.append(T(432, 522, 776, 44, "Whole seminar: design in Unit I · process in Unit II · this evidence trail in Unit III.",
                 size=13.5, color=MUTED, valign="middle"))
    els.append(T(M, 600, 1136, 24, "S. Nidhish Guhan S · Kawaskar J — 24CSI015 Software Engineering with Agile Practices",
                 size=12.5, color=MUTED, font=MONO))
    footer(els, 16); P_("16_recap.page", els)

    write_deck(d, "KCT Library Unit III — Testing, Quality & DevOps", names)
    return names

if __name__ == "__main__":
    print("unit-3 pages:", len(build()))
