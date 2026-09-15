#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""deckkit.py — Modern Library Ledger design system + PPTD element builders + Pillow charts."""
import os
import yaml
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))          # presentation/tools
BASE = os.path.dirname(ROOT)                                # presentation/

# ---------------------------------------------------------------- palette
PAPER  = "#F5F2EA"
INK    = "#1E3A2F"
INK2   = "#2E5646"
BRASS  = "#A8792C"
MUTED  = "#66756A"
LINEC  = "#D9D2C0"
PANEL  = "#EDE7D8"
PANEL2 = "#EFEADC"
FAINT  = "#E3DCC8"
WHITE  = "#FFFFFF"
BRICK  = "#96462F"
PALEBRASS = "#DCC9A5"

DISPLAY = "Georgia"
BODY    = "Helvetica"
MONO    = "Menlo"

W, H, M = 1280, 720, 72
TOTAL = 16
COURSE_LINE = "CLMS · 24CSI015 · Software Engineering with Agile Practices"

_ctr = [0]
def nid():
    _ctr[0] += 1
    return "e%03d" % _ctr[0]

def _chk(s):
    bad = [ch for ch in s if ord(ch) > 0x2122 and ch not in "₹≈×—…→←"]
    if bad:
        raise SystemExit("risky glyph(s) %r in: %s" % (bad[:4], s[:60]))
    return s

# ---------------------------------------------------------------- elements
def T(x, y, w, h, s, size=17, color=INK, font=BODY, bold=False, italic=False,
      align="left", valign="top", lh=1.25, ls=None, wrap=True):
    c = {"text": _chk(s), "fontSize": size, "color": color, "fontFamily": font,
         "bold": bold, "align": [align, valign], "lineHeight": lh}
    if italic: c["italic"] = True
    if ls is not None: c["letterSpacing"] = ls
    if not wrap: c["wrap"] = False
    return {"elementId": nid(), "elementType": "text", "bounds": [x, y, w, h], "content": c}

def P(x, y, w, h, paras, size=17, color=INK, font=BODY, lh=1.35, align="left"):
    body = "".join("<p>%s</p>" % p for p in paras)
    c = {"text": _chk(body), "fontSize": size, "color": color, "fontFamily": font,
         "align": [align, "top"], "lineHeight": lh}
    return {"elementId": nid(), "elementType": "text", "bounds": [x, y, w, h], "content": c}

def R(x, y, w, h, fill, border=None, bw=1, shape="rect", rotation=0):
    e = {"elementId": nid(), "elementType": "shape", "bounds": [x, y, w, h],
         "shapeName": shape, "fill": {"type": "solid", "color": fill}}
    e["border"] = {"style": "solid", "width": bw, "color": border if border else fill}
    if rotation: e["rotation"] = rotation
    return e

def HL(x, y, w, color=LINEC, th=1): return R(x, y, w, th, color)
def VL(x, y, h, color=LINEC, th=1): return R(x, y, th, h, color)

def _dir(x1, y1, x2, y2):
    if x2 > x1: return "right"
    if x2 < x1: return "left"
    if y2 > y1: return "down"
    return "up"

def HEAD(x, y, direction, color=INK, s=15):
    rot = {"up": 0, "right": 90, "down": 180, "left": 270}[direction]
    return R(x - s / 2.0, y - s / 2.0, s, s, color, shape="triangle", rotation=rot)

def AROW(pts, color=MUTED, th=2, head=True, hlen=15):
    out = []
    for i in range(len(pts) - 1):
        x1, y1 = pts[i]; x2, y2 = pts[i + 1]
        if y1 == y2:
            out.append(R(min(x1, x2), y1 - th / 2.0, abs(x2 - x1), th, color))
        else:
            out.append(R(x1 - th / 2.0, min(y1, y2), th, abs(y2 - y1), color))
    if head and len(pts) >= 2:
        (x1, y1), (x2, y2) = pts[-2], pts[-1]
        out.append(HEAD(x2, y2, _dir(x1, y1, x2, y2), color, hlen))
    return out

def CELL(text="", **kw):
    return {"text": str(text), "fontFamily": kw.get("font", BODY), "fontSize": kw.get("size", 13),
            "color": kw.get("color", INK), "bold": bool(kw.get("bold", False)),
            "align": [kw.get("h", "left"), "middle"],
            "fill": {"type": "solid", "color": kw.get("fill", PAPER)}, "lineHeight": 1.12}

def TBL(x, y, w, h, colw, rows, rowh=None):
    """rows already built via HDR/LEDGER-style dicts."""
    n = len(rows)
    if rowh is None:
        body = 0.84 / max(1, n - 1)
        rowh = [0.16] + [body] * (n - 1)
    return {"elementId": nid(), "elementType": "table", "bounds": [x, y, w, h],
            "columnWidths": colw, "rowHeights": rowh,
            "rows": [[CELL(**c) if isinstance(c, dict) and "text" in c else CELL(c) for c in row]
                     for row in rows]}

def HDR(labels, size=11.5):
    return [{"text": t, "fill": INK, "color": WHITE, "bold": True, "size": size} for t in labels]

def LEDGER(x, y, w, h, colw, headers, data, mono_cols=(), bold_cols=(0,), size=12.5,
           right_cols=(), accent_cols=()):
    rows = [HDR(headers)]
    for ri, row in enumerate(data):
        fill = PAPER if ri % 2 == 0 else PANEL2
        cells = []
        for ci, val in enumerate(row):
            cells.append({"text": val, "fill": fill, "bold": ci in bold_cols,
                          "font": MONO if ci in mono_cols else BODY,
                          "size": size, "h": "right" if ci in right_cols else "left",
                          "color": BRASS if ci in accent_cols else INK})
        rows.append(cells)
    return TBL(x, y, w, h, colw, rows)

def IMG(x, y, w, h, src):
    return {"elementId": nid(), "elementType": "image", "bounds": [x, y, w, h],
            "src": src, "fit": {"mode": "contain"}}

# ---------------------------------------------------------------- composites
def header(kicker, title, sub=None):
    els = [T(M, 44, 1100, 20, kicker.upper(), size=12, color=BRASS, bold=True, ls=2, wrap=False),
           T(M, 66, 1136, 44, title, size=30, color=INK, font=DISPLAY, bold=True, lh=1.0),
           R(M, 122, 56, 3, BRASS)]
    y = 160
    if sub:
        els.append(T(M, 134, 1136, 24, sub, size=15, color=MUTED, italic=True))
        y = 172
    return els, y

def footer(els, pageno):
    els.append(HL(M, 668, 1136))
    els.append(T(M, 676, 820, 16, COURSE_LINE, size=10, color=MUTED, wrap=False))
    els.append(T(1060, 676, 148, 16, "%02d / %d" % (pageno, TOTAL), size=10, color=MUTED,
                 font=MONO, align="right", wrap=False))
    return els

def COLHEAD(x, y, label, w=380):
    return [T(x, y, w, 16, label.upper(), size=11.5, color=BRASS, bold=True, ls=1.6, wrap=False),
            HL(x, y + 22, 28, BRASS, 2)]

def BUL(x, y, lines, size=15.5, color=INK, step=34, w=520, lh=1.18):
    """each line: optionally 'Head|body' — head bold, body regular. NOTE: the local
    exporter cannot handle <strong> inline (tag-stack bug), so the bold lead is a
    separate adjacent text box sized from an estimated width."""
    els = []
    for i, ln in enumerate(lines):
        yy = y + i * step
        els.append(T(x, yy + 1, 16, 22, "•", size=size, color=BRASS, bold=True, wrap=False))
        if "|" in ln:
            head, body = ln.split("|", 1)
            hw = len(head) * size * 0.545
            els.append(T(x + 24, yy, hw + 14, step + 6, head, size=size, color=color,
                         bold=True, lh=lh, wrap=False))
            els.append(T(x + 24 + hw + 10, yy, w - hw - 40, step + 6, body.strip(),
                         size=size, color=color, lh=lh, wrap=False))
        else:
            els.append(T(x + 24, yy, w, step + 6, ln, size=size, color=color, lh=lh))
    return els

def STAT(x, y, num, label, sub=None, numsize=46, numcolor=INK, w=280, labelsize=11):
    els = [T(x, y, w, numsize + 10, num, size=numsize, color=numcolor, font=DISPLAY,
             bold=True, lh=1.0, wrap=False),
           T(x, y + numsize + 14, w, 18, label.upper(), size=labelsize, color=MUTED,
             bold=True, ls=1.4, wrap=False)]
    if sub:
        els.append(T(x, y + numsize + 36, w, 18, sub, size=12, color=MUTED))
    return els

def CHIP(x, y, w, h, label, fill=INK, tcolor=WHITE, font=MONO, size=12, body_font=False):
    f = BODY if body_font else font
    return [R(x, y, w, h, fill, shape="roundRect"),
            T(x + 6, y, w - 12, h, label, size=size, color=tcolor, font=f, bold=True,
              align="center", valign="middle", lh=1.0, wrap=False)]

def BAR(y, text_, fill=INK, tcolor=WHITE, size=13.5, font=BODY, h=48):
    return [R(M, y, 1136, h, fill),
            T(M + 24, y, 1090, h, text_, size=size, color=tcolor, font=font, bold=True,
              valign="middle", lh=1.05)]

def cover(unit_roman, title_lines, tagline, deck_marker):
    els = [R(0, 0, 16, H, INK),
           T(848, 250, 400, 380, unit_roman, size=280, color=FAINT, font=DISPLAY, bold=True,
             align="right", lh=1.0, wrap=False),
           T(M, 60, 1000, 20, "COLLEGE LIBRARY MANAGEMENT SYSTEM · UNIVERSITY PROJECT SEMINAR",
             size=12, color=BRASS, bold=True, ls=2.2, wrap=False),
           T(M, 92, 700, 22, "COURSE 24CSI015 · SOFTWARE ENGINEERING WITH AGILE PRACTICES",
             size=11.5, color=MUTED, bold=True, ls=1.6, wrap=False)]
    els.append(T(M, 168, 700, 26, "Unit " + unit_roman + " of III",
                 size=15, color=BRASS, font=DISPLAY, italic=True, bold=True, wrap=False))
    for i, ln in enumerate(title_lines):
        els.append(T(M, 202 + i * 64, 860, 64, ln, size=46, color=INK, font=DISPLAY, bold=True,
                     lh=1.0, wrap=False))
    ry = 224 + len(title_lines) * 64
    els.append(R(M, ry, 96, 4, BRASS))
    els.append(T(M, ry + 28, 820, 48, tagline, size=16, color=MUTED))
    ty = 470
    els.append(VL(M, ty, 132, LINEC, 2))
    els.append(T(M + 24, ty + 2, 300, 20, "TEAM", size=11, color=BRASS, bold=True, ls=2, wrap=False))
    for j, (nm, role) in enumerate([("S. Nidhish Guhan S", "— Product Owner / Developer"),
                                    ("Kawaskar J", "— Scrum Master / Developer")]):
        ry = ty + 34 + j * 34
        els.append(T(M + 24, ry, 240, 26, nm, size=15, color=INK, bold=True, wrap=False))
        els.append(T(M + 24 + 180, ry, 420, 26, role, size=15, color=MUTED, wrap=False))
    els.append(T(M, 644, 700, 20, "Project seminar · September 2026", size=13, color=MUTED, font=MONO))
    els.append(T(860, 644, 348, 20, deck_marker, size=11, color=MUTED, font=MONO,
                 align="right", wrap=False))
    return els

def recap_tail(els, lesson, nextline, pageno):
    els += BAR(468, lesson, size=13.5)
    els += CHIP(M, 548, 330, 44, "Delivered v1.0.0 · 4 Sep 2026", fill=INK, size=13, body_font=True)
    els.append(T(432, 548, 776, 44, nextline, size=13.5, color=MUTED, valign="middle"))
    return footer(els, pageno)

def write_page(dirpath, name, els, page_type="content"):
    page = {"pageType": page_type,
            "background": {"type": "solid", "color": PAPER},
            "elements": els}
    with open(os.path.join(dirpath, "pages", name), "w", encoding="utf-8") as f:
        yaml.safe_dump(page, f, sort_keys=False, allow_unicode=True, width=10000)

def write_deck(dirpath, title, page_names):
    deck = {
        "version": "v2",
        "title": title,
        "size": [W, H],
        "theme": {
            "colors": {"paper": PAPER, "ink": INK, "brass": BRASS, "muted": MUTED,
                       "line": LINEC, "panel": PANEL, "faint": FAINT, "white": WHITE,
                       "brick": BRICK, "text": INK},
            "textStyles": {
                "display": {"fontFamily": DISPLAY, "color": INK},
                "body":    {"fontFamily": BODY, "color": INK},
                "mono":    {"fontFamily": MONO, "color": INK},
                "kicker":  {"fontFamily": BODY, "color": BRASS},
                "muted":   {"fontFamily": BODY, "color": MUTED},
            },
        },
        "pages": ["pages/" + n for n in page_names],
    }
    with open(os.path.join(dirpath, "deck.pptd"), "w", encoding="utf-8") as f:
        yaml.safe_dump(deck, f, sort_keys=False, allow_unicode=True, width=10000)

def unit_dir(unit):
    d = os.path.join(BASE, unit)
    for sub in ("pages", "media"):
        os.makedirs(os.path.join(d, sub), exist_ok=True)
    return d

# ---------------------------------------------------------------- charts
def _f(supp_name, size):
    paths = ["/System/Library/Fonts/Supplemental/" + supp_name,
             "/System/Library/Fonts/" + supp_name]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

def chart_velocity(path):
    SS = 2; w, h = 1408, 784
    reg = _f("Arial.ttf", 20 * SS); bold = _f("Arial Bold.ttf", 20 * SS)
    gbold = _f("Georgia Bold.ttf", 21 * SS)
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    L, Rt, Tp, B = 92 * SS, w - 28 * SS, 84 * SS, h - 56 * SS
    planned   = [17, 16, 21, 22, 13, 18, 21]
    completed = [17, 16, 18, 22, 13, 16, 24]
    ymax = 26
    def X(i): return L + (Rt - L) * i / 6.0
    def Y(v): return B - (B - Tp) * v / float(ymax)
    for v in (0, 5, 10, 15, 20, 25):
        d.line([(L, Y(v)), (Rt, Y(v))], fill=LINEC, width=2)
        d.text((L - 12 * SS, Y(v) - 10 * SS), str(v), font=reg, fill=MUTED, anchor="rm")
    d.text((L, Tp - 40 * SS), "story points", font=reg, fill=MUTED)
    ay = Y(18); xx = L
    while xx < Rt:
        d.line([(xx, ay), (min(xx + 8 * SS, Rt), ay)], fill=BRASS, width=3)
        xx += 14 * SS
    d.text((Rt - 4, ay - 30 * SS), "mean 18", font=bold, fill=BRASS, anchor="rm")
    bw = (Rt - L) / 7 * 0.30
    for i in range(7):
        cx = X(i)
        d.rectangle([cx - bw - 3 * SS, Y(planned[i]), cx - 3 * SS, B], fill=PALEBRASS)
        d.rectangle([cx + 3 * SS, Y(completed[i]), cx + bw, B], fill=INK)
        d.text((cx + 3 * SS + bw / 2, Y(completed[i]) - 33 * SS), str(completed[i]),
               font=gbold, fill=INK, anchor="ma")
        d.text((cx - bw / 2 - 3 * SS, Y(planned[i]) - 30 * SS), str(planned[i]),
               font=reg, fill=MUTED, anchor="ma")
        d.text((cx, B + 10 * SS), "S%d" % (i + 1), font=bold, fill=INK, anchor="ma")
    for i, lab in ((2, "RES-001 slip"), (5, "UI-002 slip")):
        d.text((X(i), B + 36 * SS), lab, font=reg, fill=BRICK, anchor="ma")
    lx = L + 8 * SS; ly = Tp - 42 * SS
    d.rectangle([lx, ly, lx + 22 * SS, ly + 15 * SS], fill=PALEBRASS)
    d.text((lx + 28 * SS, ly - 3 * SS), "planned", font=reg, fill=MUTED)
    d.rectangle([lx + 132 * SS, ly, lx + 154 * SS, ly + 15 * SS], fill=INK)
    d.text((lx + 160 * SS, ly - 3 * SS), "completed", font=reg, fill=MUTED)
    d.line([(L, B), (Rt, B)], fill=INK, width=3)
    img.save(path)

def chart_burndown(path):
    SS = 2; w, h = 1240, 720
    reg = _f("Arial.ttf", 18 * SS); bold = _f("Arial Bold.ttf", 18 * SS)
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    L, Rt, Tp, B = 80 * SS, w - 30 * SS, 44 * SS, h - 74 * SS
    start = 21
    ideal = [start * (1 - t / 10.0) for t in range(11)]
    actual = [21, 19, 17, 15, 13, 16, 13, 10, 6, 4, 3]
    def X(t): return L + (Rt - L) * t / 10.0
    def Y(v): return B - (B - Tp) * v / 24.0
    for v in (0, 6, 12, 18, 24):
        d.line([(L, Y(v)), (Rt, Y(v))], fill=LINEC, width=2)
        d.text((L - 10 * SS, Y(v) - 9 * SS), str(v), font=reg, fill=MUTED, anchor="rm")
    for t in range(11):
        d.text((X(t), B + 8 * SS), str(t), font=reg, fill=MUTED, anchor="ma")
    d.text(((L + Rt) / 2, B + 32 * SS), "sprint day", font=reg, fill=MUTED, anchor="ma")
    d.text((26, Tp - 30 * SS), "pts left", font=reg, fill=MUTED)
    for t in range(10):
        d.line([(X(t), Y(ideal[t])), (X(t + 1), Y(ideal[t + 1]))], fill=MUTED, width=3)
    for t in range(10):
        d.line([(X(t), Y(actual[t])), (X(t + 1), Y(actual[t + 1]))], fill=BRASS, width=6)
    for t, v in enumerate(actual):
        d.ellipse([X(t) - 5 * SS, Y(v) - 5 * SS, X(t) + 5 * SS, Y(v) + 5 * SS], fill=BRASS)
    d.text((X(5) + 12 * SS, Y(16) - 46 * SS), "+3 pts · RES-001", font=bold, fill=BRICK, anchor="lm")
    d.text((X(9) - 10 * SS, Y(4) - 40 * SS), "closed 18 · carried 3", font=reg, fill=MUTED, anchor="rm")
    lx = Rt - 290 * SS
    d.line([(lx, Tp - 24 * SS), (lx + 28 * SS, Tp - 24 * SS)], fill=MUTED, width=3)
    d.text((lx + 34 * SS, Tp - 32 * SS), "ideal", font=reg, fill=MUTED)
    d.line([(lx + 118 * SS, Tp - 24 * SS), (lx + 146 * SS, Tp - 24 * SS)], fill=BRASS, width=6)
    d.text((lx + 152 * SS, Tp - 32 * SS), "actual", font=reg, fill=MUTED)
    d.line([(L, B), (Rt, B)], fill=INK, width=3)
    img.save(path)

def chart_barcode(path):
    SS = 2; w, h = 904, 376
    img = Image.new("RGB", (w, h), WHITE)
    d = ImageDraw.Draw(img)
    code = "LIB-CSALG01-001"
    widths = [3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 1, 3, 2, 4, 1, 2, 1, 3, 4, 2, 1, 3, 2,
              1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3]
    x = 40; top = 26; bot = 232; k = 0; ink_on = True
    while x < w - 40:
        cw = widths[k % len(widths)] * 3 * SS + 2
        if (ord(code[(k // 4) % len(code)]) + k) % 7 == 0:
            cw = 2 * SS
        if ink_on:
            d.rectangle([x, top, x + cw, bot], fill=INK)
        x += cw + 4
        ink_on = not ink_on
        k += 1
    d.rectangle([40, bot + 4, 40, bot + 4], fill=INK)
    reg = _f("Arial.ttf", 15 * SS)
    small = _f("Arial.ttf", 10 * SS)
    d.text((w / 2, bot + 26), code, font=reg, fill=INK, anchor="ma")
    d.text((w / 2, bot + 58), "CODE 128 · RENDERED BY BWIP-JS (SYMBOL MOTIF)",
           font=small, fill=MUTED, anchor="ma")
    img.save(path)

def chart_pyramid(path):
    SS = 2; w, h = 1120, 720
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)
    bold = _f("Arial Bold.ttf", 15 * SS)
    reg = _f("Arial.ttf", 13 * SS)
    gbold = _f("Georgia Bold.ttf", 20 * SS)
    cx = w // 2
    tiers = [("UNIT", "90+ domain & repository specs", 620, 452, 640, "#33604E", WHITE),
             ("INTEGRATION", "~31 route & service tests", 380, 226, 448, INK, WHITE),
             ("E2E", "2 Selenium journeys", 220, 40, 216, BRASS, WHITE)]
    for lab, sub, w2, y0, y1, col, tcol in tiers:
        d.polygon([(cx - w2 // 2 + 26, y0), (cx + w2 // 2 - 26, y0),
                   (cx + w2 // 2 + 40, y1), (cx - w2 // 2 - 40, y1)], fill=col)
        mid = (y0 + y1) // 2
        d.text((cx, mid - 15), lab, font=gbold, fill=tcol, anchor="mm")
        d.text((cx, mid + 16), sub, font=reg, fill=tcol, anchor="mm")
    img.save(path)
