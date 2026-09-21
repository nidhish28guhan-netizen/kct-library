#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Unit II — Agile Practices & Project Management (16 slides)."""
import os
from deckkit import *

def build():
    d = unit_dir("unit-2")
    chart_velocity(os.path.join(d, "media", "velocity.png"))
    chart_burndown(os.path.join(d, "media", "burndown-s3.png"))
    names = []
    def P_(name, els, pt="content"):
        write_page(d, name, els, pt); names.append(name)

    # 1 cover -----------------------------------------------------------
    P_("01_cover.page", cover("II", ["Agile Practices &", "Project Management"],
        "Seven sprints, one board, two people — how the Lean/Scrum/Kanban/XP hybrid actually ran.",
        "deck 2 / 3"), "cover")

    # 2 agenda ----------------------------------------------------------
    els, y = header("Agenda · Unit II", "What this unit covers")
    parts = [("01", "FRAMEWORK", "The four-way hybrid · roles and ceremonies"),
             ("02", "BACKLOG", "Epics and points · story anatomy · estimation"),
             ("03", "EXECUTION", "Cadence · velocity · burndown · honesty · Jira · the team"),
             ("04", "PLANNING EVIDENCE", "WBS · COCOMO II · risk register · retrospectives")]
    yy = 190
    for num, t, topics in parts:
        els.append(HL(M, yy - 16, 1136))
        els.append(T(M, yy, 70, 30, num, size=17, color=BRASS, font=MONO, bold=True, wrap=False))
        els.append(T(M + 92, yy - 3, 600, 34, t, size=21, color=INK, font=DISPLAY, bold=True, wrap=False))
        els.append(T(640, yy + 2, 568, 28, topics, size=14.5, color=MUTED, align="right"))
        yy += 110
    footer(els, 2); P_("02_agenda.page", els)

    # 3 frameworks ------------------------------------------------------
    els, y = header("Unit II · Part 1 · Framework", "Not one framework — four, each hired for a different job")
    quads = [("SCRUM", "gives the cadence",
              "Two-week sprints · planning poker & reviews · retros per sprint · all seven closed"),
             ("XP", "gives engineering discipline",
              "TDD on domain rules · refactoring under coverage floors · small releasable increments"),
             ("KANBAN", "gives the desk flow",
              "Returns, holds and maintenance visualised as queue work · WIP kept at desk scale"),
             ("LEAN", "kills hand-off waste",
              "Story-gated scope · no speculative build · every point moves the ledger")]
    pos = [(M, 182), (660, 182), (M, 388), (660, 388)]
    for (t, sub, body), (qx, qy) in zip(quads, pos):
        els.append(R(qx, qy, 548, 186, PANEL))
        els.append(R(qx, qy, 6, 186, BRASS))
        els.append(T(qx + 28, qy + 16, 500, 26, t, size=18, color=INK, font=DISPLAY,
                     bold=True, ls=1.5, wrap=False))
        els.append(T(qx + 28, qy + 46, 500, 20, sub, size=13, color=BRASS, italic=True, wrap=False))
        for j, seg in enumerate(body.split(" · ")):
            els.append(T(qx + 28, qy + 76 + j * 27, 508, 24, "• " + seg, size=13, color=INK, wrap=False))
    els += BAR(598, "Scrum for cadence, XP for engineering discipline, Kanban for desk-flow support work, Lean to kill hand-off waste.",
               size=13, font=DISPLAY, h=46)
    footer(els, 3); P_("03_frameworks.page", els)

    # 4 roles & ceremonies ------------------------------------------------
    els, y = header("Unit II · Part 1 · Framework", "Two people wearing every hat — on a documented calendar")
    els.append(LEDGER(M, 180, 1136, 306, [0.22, 0.24, 0.16, 0.38],
        ["CEREMONY", "WHEN", "WHO", "WHAT COMES OUT"],
        [["Sprint planning", "Day 1 of every sprint", "PO + SM", "Committed points, poker-sized"],
         ["Daily stand-up", "Daily, 15 minutes", "Whole team", "Blockers moved to the Kanban desk"],
         ["Sprint review", "Sprint end", "Team + library desk staff", "Working flow shown on localhost:4000"],
         ["Retrospective", "Sprint end", "Whole team", "A rule change for the Definition of Done"],
         ["Backlog refinement", "Continuous", "Product Owner", "Stories sliced to fit one sprint"]],
        size=12.5))
    els += CHIP(M, 512, 420, 42, "PO: Library Administration — Product Owner",
                fill=INK, size=11.5, body_font=True)
    els += CHIP(506, 512, 430, 42, "SM: Library IT — System Administration",
                fill=INK, size=11.5, body_font=True)
    els.append(T(M, 580, 1136, 40, "A two-person Scrum keeps ceremony overhead lean: the review output is a working desk flow, not a status deck.",
                 size=14, color=MUTED))
    footer(els, 4); P_("04_ceremonies.page", els)

    # 5 backlog -----------------------------------------------------------
    els, y = header("Unit II · Part 2 · Backlog", "Ten epics, 126 points — the planning ledger")
    ep_a = [["E1", "Foundation, Auth & Access", "11"], ["E2", "Members", "6"],
            ["E3", "Catalogue & Search (incl. US-37*)", "14"], ["E4", "Copies & Barcodes", "11"],
            ["E5", "Circulation", "16"]]
    ep_b = [["E6", "Reservations", "19"], ["E7", "Penalties & Policies", "10"],
            ["E8", "Recommendations", "13"], ["E9", "Notifications", "13"],
            ["E10", "Reports, Admin & Release Quality", "13"]]
    for tab, tx in ((ep_a, M), (ep_b, 660)):
        rows = [HDR(["EPIC", "SCOPE", "PTS"])]
        for ri, (a, b, c) in enumerate(tab):
            fill = PAPER if ri % 2 == 0 else PANEL2
            rows.append([{"text": a, "fill": fill, "font": MONO, "bold": True, "size": 12.5},
                         {"text": b, "fill": fill, "size": 12.5},
                         {"text": c, "fill": fill, "font": MONO, "bold": True, "size": 12.5,
                          "h": "right", "color": BRASS}])
        els.append(TBL(tx, 190, 548, 300, [0.18, 0.62, 0.20], rows))
    els.append(T(M, 156, 1136, 22, "Fibonacci planning-level sizing · 37 stories live under these ten epics",
                 size=13.5, color=MUTED))
    els += BAR(524, "125 of 126 points were delivered — US-37 (1 pt) was deferred at review rather than dilute the release.",
               size=13, h=44)
    els.append(T(M, 588, 1136, 30, "Epic sums reconcile to scope: 58 + 68 = 126 pts planned · 125 pts delivered.",
                 size=12, color=MUTED, font=MONO))
    footer(els, 5); P_("05_backlog.page", els)

    # 6 story anatomy -------------------------------------------------------
    els, y = header("Unit II · Part 2 · Backlog", "A story is done only when its acceptance reads like the code")
    els += COLHEAD(M, 176, "Story template")
    els.append(R(M, 206, 540, 96, INK))
    els.append(P(M + 22, 206, 500, 96,
        ["<span style=\"color:#DCC9A5;font-size:13px\">As a [role],</span>",
         "<span style=\"color:#FFFFFF;font-size:15px\">I want [capability],</span>",
         "<span style=\"color:#DCC9A5;font-size:13px\">so that [value].</span>"],
        size=14, color=WHITE, lh=1.45))
    els += COLHEAD(M, 336, "One real hold story")
    els.append(T(M, 366, 540, 24, "As a librarian,", size=15, color=INK, bold=True, wrap=False))
    els.append(T(M, 392, 540, 96, "I want a returned reserved copy to reach the queued member, so that holds keep their promised order.",
                 size=15, color=INK, lh=1.35))
    els += COLHEAD(660, 176, "Acceptance criteria · Given / When / Then")
    gwt = [("GIVEN", "a copy is returned and its reservation queue is non-empty"),
           ("WHEN", "the librarian completes the return at the desk"),
           ("THEN", "the next member — FACULTY, then FIFO, then ID — moves to READY; the 48 h window opens"),
           ("AND", "a cancelled READY hold re-dispatches: the RES-001 regression pin")]
    yy = 210
    for tag, body in gwt:
        els.append(T(660, yy, 92, 20, tag, size=11.5, color=BRASS, font=MONO, bold=True, wrap=False))
        els.append(T(760, yy - 1, 452, 56, body, size=13.5, color=INK, lh=1.2))
        els.append(HL(660, yy + 62, 548))
        yy += 86
    els.append(T(M, 520, 560, 60, "Acceptance criteria are written in test language — they become jest specs and Selenium assertions almost verbatim.",
                 size=13.5, color=MUTED))
    footer(els, 6); P_("06_story.page", els)

    # 7 estimation ----------------------------------------------------------
    els, y = header("Unit II · Part 2 · Backlog", "Planning poker on a Fibonacci ladder — disagreement is the point")
    for i, v in enumerate(["1", "2", "3", "5", "8", "13"]):
        x = M + i * 96
        els.append(R(x, 186, 80, 92, PANEL if i % 2 == 0 else PANEL2, border=BRASS, bw=1, shape="roundRect"))
        els.append(T(x, 186, 80, 92, v, size=30, color=INK, font=DISPLAY, bold=True,
                     align="center", valign="middle", wrap=False))
    els.append(T(M, 290, 560, 20, "FIBONACCI STORY-POINT SCALE", size=11, color=MUTED,
                 bold=True, ls=1.5, wrap=False))
    els += COLHEAD(M, 340, "Why this works for KCT Library")
    els += BUL(M, 374, [
        "Silent first estimates| — no anchoring to the louder hat",
        "Coarse scale| — matches real uncertainty, not hours",
        "Debate only on gaps| — cards within one step converge",
        "Capacity cross-check| — 126 pts over mean 18 is seven sprints"], w=640, step=42)
    els += STAT(860, 196, "126", "TOTAL SCOPE (PTS)", numsize=56, w=340)
    els += STAT(860, 340, "18", "MEAN POINTS / SPRINT", sub="over seven closed sprints",
                numsize=56, numcolor=BRASS, w=340)
    footer(els, 7); P_("07_estimation.page", els)

    # 8 cadence ---------------------------------------------------------------
    els, y = header("Unit II · Part 3 · Execution", "Seven two-week sprints — 1 Jun to 4 Sep 2026, all closed")
    pts = [17, 16, 18, 22, 13, 16, 24]
    x = M
    for i in range(7):
        els.append(R(x, 216, 148, 76, INK if pts[i] >= 16 else BRASS, shape="chevron"))
        els.append(T(x + 28, 222, 116, 26, "S%d" % (i + 1), size=15, color=WHITE, font=DISPLAY,
                     bold=True, align="center", wrap=False))
        els.append(T(x + 28, 250, 116, 32, "%d pts" % pts[i], size=14, color=WHITE, font=MONO,
                     align="center", wrap=False))
        x += 158
    els.append(T(M, 178, 400, 20, "1 JUN 2026", size=12, color=MUTED, font=MONO, ls=1.5))
    els.append(T(832, 178, 376, 20, "4 SEP 2026 · RELEASE v1.0.0", size=12, color=BRASS,
                 font=MONO, ls=1.5, align="right"))
    els.append(HL(M, 316, 1136))
    els.append(T(368, 330, 300, 20, "S3 slip · RES-001 found", size=12, color=BRICK, font=MONO, wrap=False))
    els.append(T(842, 330, 300, 20, "S6 slip · UI-002 found", size=12, color=BRICK, font=MONO, wrap=False))
    els += BUL(M, 380, [
        "Both slips surfaced in their sprint review| and were recovered the sprint after",
        "S4 closed 22 points| — absorbing S3's three carried points inside a healthy sprint",
        "S7 closed 24 points| — the strongest sprint, delivered right at the release"], w=1100, step=44)
    els += BAR(558, "Every sprint closed at release — no open sprint was parked when v1.0.0 shipped.", size=13.5)
    footer(els, 8); P_("08_cadence.page", els)

    # 9 velocity ----------------------------------------------------------------
    els, y = header("Unit II · Part 3 · Execution", "Velocity held at 18 — and both dips explain themselves")
    els.append(IMG(M, 172, 704, 392, "media/velocity.png"))
    els += STAT(824, 186, "18", "MEAN COMPLETED PTS", numsize=52, w=380)
    els += STAT(824, 292, "13–24", "SPRINT RANGE", sub="low S5 · peak S7", numsize=44,
                numcolor=BRASS, w=380)
    els += BUL(824, 404, [
        "Planned vs completed| tracked every sprint",
        "Dips were honest| — found defects, not lost effort",
        "Recovery systematic| — next sprint absorbed it"], w=390, step=42, size=13.5)
    els.append(T(M, 586, 1136, 40, "Completed: 17, 16, 18, 22, 13, 16, 24 = 126 pts · Planned: 17, 16, 21, 22, 13, 18, 21",
                 size=11.5, color=MUTED, font=MONO))
    footer(els, 9); P_("09_velocity.page", els)

    # 10 burndown ------------------------------------------------------------------
    els, y = header("Unit II · Part 3 · Execution", "Sprint 3's burndown tells the only story that matters: truth")
    els.append(IMG(M, 176, 620, 360, "media/burndown-s3.png"))
    els += COLHEAD(724, 188, "Reading the bump")
    els += BUL(724, 222, [
        "Planned 21 points| — ideal line runs straight down",
        "Day 5: RES-001| — cancelled READY holds can strand a copy",
        "+3 points| enter as the regression-safe fix is scoped",
        "Closed at 18| — three points carried, openly, to S4"], w=484, step=44)
    els.append(T(M, 548, 620, 40, "Chart: ideal vs actual points remaining, sprint days 0–10.",
                 size=11.5, color=MUTED, font=MONO))
    els += BAR(588, "A bump you can see is a plan you can trust — hiding it would only move the surprise to the release.",
               size=13, h=42)
    footer(els, 10); P_("10_burndown.page", els)

    # 11 carryover --------------------------------------------------------------------
    els, y = header("Unit II · Part 3 · Execution", "Carry-over and deferral were decisions, not accidents")
    cards = [("US-15 · US-30", "Carried across sprint boundaries, re-estimated in poker, closed in the next review window.", INK),
             ("US-37 · 1 pt", "Deferred at review — the only story that did not reach v1.0.0; recorded on the board, not in a footnote.", BRASS),
             ("The standing rule", "A sprint may close with fewer points, never with looser acceptance criteria.", BRICK)]
    for i, (t, body, col) in enumerate(cards):
        x = M + i * 384
        els.append(R(x, 184, 356, 236, PANEL))
        els.append(R(x, 184, 356, 5, col))
        els.append(T(x + 22, 204, 312, 26, t, size=16.5, color=INK, font=MONO, bold=True, wrap=False))
        els.append(T(x + 22, 240, 312, 164, body, size=13.5, color=INK, lh=1.4))
    els += COLHEAD(M, 452, "What the team learned")
    els += BUL(M, 486, [
        "Buffers belong in the plan| — discovery always costs points",
        "Deferral is scope control| — it protected the release date",
        "Visibility over heroics| — carried stories re-enter poker like new work"], w=1100, step=44)
    footer(els, 11); P_("11_carryover.page", els)

    # 12 jira ---------------------------------------------------------------------------
    els, y = header("Unit II · Part 3 · Execution", "Jira KCT Library is the paper trail — a live, company-managed Scrum board")
    for i, (n, lab) in enumerate([("55", "TOTAL ISSUES"), ("10", "EPICS"), ("37", "STORIES")]):
        els += STAT(M + i * 380, 188, n, lab, numsize=62)
        if i < 2: els.append(VL(M + (i + 1) * 380 - 40, 194, 96, LINEC, 2))
    els += BUL(M, 344, [
        "Company-managed Scrum board| — sprints started and completed on schedule",
        "All seven sprints| show a sprint-closed event on the board",
        "Issue keys run NS-1 to NS-9| — stories, tasks and defects share one ledger"], w=1100, step=42)
    els += CHIP(M, 508, 340, 44, "project: KCT Library · Scrum (company-managed)", fill=INK, size=11.5)
    els.append(T(428, 508, 780, 44, "Board numbers are quoted as text evidence — the live board is available for the seminar walkthrough.",
                 size=13, color=MUTED, valign="middle"))
    footer(els, 12); P_("12_jira.page", els)

    # 13 team + DoD ----------------------------------------------------------------------
    els, y = header("Unit II · Part 3 · Execution", "Two builders, balanced load, one shared finish line")
    rows = [HDR(["MEMBER", "HAT", "AREA OF GRAVITY", "PTS"])]
    split = [["Library Administration", "Product Owner", "Backend · domain · DevOps", "61"],
             ["Library IT", "Scrum Master", "Frontend · E2E · docs", "64"],
             ["TOTAL DELIVERED", "—", "of 126 points scoped", "125"]]
    for ri, r in enumerate(split):
        last = ri == 2
        fill = INK if last else (PAPER if ri % 2 == 0 else PANEL2)
        col = WHITE if last else INK
        rows.append([{"text": v, "fill": fill, "color": col,
                      "bold": ci == 0 or last, "size": 13,
                      "h": "right" if ci == 3 else "left",
                      "font": MONO if ci == 3 else BODY} for ci, v in enumerate(r)])
    els.append(TBL(M, 184, 1136, 170, [0.26, 0.18, 0.42, 0.14], rows))
    els.append(T(M, 372, 1136, 20, "POINT SPLIT — THE 125-POINT DELIVERED SCOPE", size=11,
                 color=MUTED, bold=True, ls=1.4, wrap=False))
    els += COLHEAD(M, 416, "Definition of Done (per story)")
    els += BUL(M, 450, [
        "Acceptance criteria proven| at API level, not just visually",
        "Tests green| — module coverage floor respected (80% target)",
        "Receipt + barcode path| smoke-checked on a real flow",
        "Seed docs updated| so the next sprint starts from truth",
        "Shown on localhost:4000| at the sprint review"], w=560, step=40, size=14.5)
    els.append(R(660, 450, 548, 158, PANEL))
    els.append(R(660, 450, 548, 5, BRASS))
    els.append(T(684, 468, 500, 22, "WHY THE SPLIT LOOKS LIKE THIS", size=11, color=BRASS,
                 bold=True, ls=1.5, wrap=False))
    els.append(T(684, 496, 500, 100, "Backend and DevOps carry heavier discovery (state machine, store); frontend carries surface area (SPA, receipts, docs). Neither hat outranks: cross-review is baked into DoD.",
                 size=13.5, color=INK, lh=1.35))
    footer(els, 13); P_("13_team.page", els)

    # 14 WBS + COCOMO ---------------------------------------------------------------------
    els, y = header("Unit II · Part 4 · Planning evidence", "WBS to three levels — and a COCOMO II sanity check")
    els.append(R(M, 176, 218, 44, INK))
    els.append(T(M, 176, 218, 44, "1 · KCT Library", size=14, color=WHITE, font=DISPLAY, bold=True,
                 align="center", valign="middle", wrap=False))
    branches = [("1.1 Foundation", "auth+RBAC · binary store"),
                ("1.2 Circulation", "loans · holds · fines"),
                ("1.3 Experience", "SPA · receipts · a11y"),
                ("1.4 Quality & release", "tests · CI · Docker")]
    byy = 248
    for t, s2 in branches:
        els += AROW([(181, 220), (181, byy + 21), (M, byy + 21)], color=MUTED, th=1, head=False)
        els.append(R(M, byy, 252, 42, PANEL, border=INK, bw=1))
        els.append(T(M + 12, byy, 240, 42, t, size=13.5, color=INK, bold=True, valign="middle", wrap=False))
        els.append(T(344, byy + 4, 250, 18, s2, size=11.5, color=MUTED, font=MONO, wrap=False))
        byy += 58
    els.append(T(M, 500, 540, 20, "LEVEL 3 · WORK PACKAGES", size=11,
                 color=BRASS, bold=True, ls=1.4, wrap=False))
    els.append(T(M, 528, 540, 44, "e.g. 1.2.3 — the FACULTY-first hold queue: sized in planning poker, exercised in S3.",
                 size=13, color=MUTED, lh=1.3))
    els.append(VL(616, 176, 392, LINEC, 2))
    els += COLHEAD(660, 176, "COCOMO II · basic, organic mode")
    els.append(R(660, 210, 548, 120, INK))
    els.append(P(684, 210, 500, 120,
        ["<span style=\"color:#DCC9A5;font-size:14px\">E = a × (KLOC)^b,  a=2.4 · b=1.05</span>",
         "<span style=\"color:#FFFFFF;font-size:17px\">E = 2.4 × (1.585 KLOC)^1.05 ≈ 3.9 person-months</span>"],
        size=14, color=WHITE, lh=1.7))
    els += BUL(660, 356, [
        "1.585 KLOC| = 1,585 measured LOC of the shipped system",
        "Schedule estimate| ≈ 3.9 months for the modelled effort",
        "Actual window| 1 Jun – 4 Sep 2026 · two people, 7 sprints"], w=548, step=42)
    els.append(T(660, 500, 548, 40, "A Jun–Sep Gantt was maintained over the same window, branch by WBS branch.",
                 size=13, color=MUTED, lh=1.3))
    els += BAR(560, "Estimate vs reality: the model said 3.9 person-months over 3.9 months; two builders landed it in one summer.",
               size=13, h=44)
    footer(els, 14); P_("14_wbs.page", els)

    # 15 risks ------------------------------------------------------------------------------
    els, y = header("Unit II · Part 4 · Planning evidence", "Six risks tracked — the top three changed the code")
    els.append(LEDGER(M, 180, 1136, 250, [0.24, 0.24, 0.52],
        ["RISK", "IMPACT IF REAL", "MITIGATION — LANDED IN CODE"],
        [["Data corruption", "Catalogue lost", "Atomic tmp + rename writes, store-tested"],
         ["Requirement churn", "Scope drift, blown date", "Story-gated scope; re-entry via poker"],
         ["Flaky E2E signal", "False red, lost trust in CI", "Explicit selector rule (E2E-003)"]],
        size=12.5))
    els.append(T(M, 448, 1136, 20, "Full register: six risks, owned on the Jira board; these three earned permanent engineering answers.",
                 size=13, color=MUTED))
    els += COLHEAD(M, 488, "Retrospectives that actually landed")
    els += BUL(M, 520, [
        "S2 retro|: selector policy added to DoD after first flake",
        "S3 retro|: coverage floor enforced after RES-001 discovery",
        "S6 retro|: authenticated-asset fetch rule after UI-002"], w=1100, step=40, size=14.5)
    footer(els, 15); P_("15_risks.page", els)

    # 16 recap ---------------------------------------------------------------------------------
    els, y = header("Unit II · Recap", "Unit II in four lines")
    lines = ["The hybrid worked: Scrum cadence, XP discipline, Kanban desk flow, Lean restraint.",
             "Seven sprints, mean 18 points — both dips surfaced at review and healed the sprint after.",
             "Board, WBS and COCOMO agree with each other: 126 pts scoped, 125 delivered, one deferred.",
             "Every retrospective ended as a DoD rule, not a wish."]
    yy = 186
    for i, ln in enumerate(lines):
        els.append(T(M, yy, 64, 30, "0%d" % (i + 1), size=16, color=BRASS, font=MONO, bold=True, wrap=False))
        els.append(T(M + 62, yy - 3, 1074, 56, ln, size=18, color=INK, font=DISPLAY))
        yy += 66
    recap_tail(els, "Process lesson: cadence turns honesty into a habit, not an event.",
               "Next · Unit III — how this backlog was tested, measured and shipped.", 16)
    P_("16_recap.page", els)

    write_deck(d, "KCT Library Unit II — Agile Practices & Project Management", names)
    return names

if __name__ == "__main__":
    print("unit-2 pages:", len(build()))
