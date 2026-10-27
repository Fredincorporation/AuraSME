# -*- coding: utf-8 -*-
"""Generate the AuraSME investor pitch deck as both .pptx and .pdf from one content model.
Honest, codebase-grounded facts only (counts verified against the repo)."""
import os

# ---- palette -------------------------------------------------------------
NAVY  = (11, 42, 74)
DEEP  = (7, 22, 44)
TEAL  = (18, 165, 165)
AMBER = (245, 166, 35)
LIGHT = (244, 247, 250)
INK   = (30, 41, 59)
MUTED = (100, 116, 139)
WHITE = (255, 255, 255)
LINE  = (226, 232, 240)

# ---- content -------------------------------------------------------------
DECK = [
    {"kind": "cover",
     "title": "AuraSME",
     "subtitle": "SME Quoting at Scale — from raw census to a bindable policy in seconds.",
     "badge": "Cigna × Ignyte  ·  Quote in Seconds Challenge  ·  Theme 2",
     "footer": "Investor & Judging Preview  ·  October 2026"},

    {"kind": "bullets", "eyebrow": "The problem",
     "title": "Group-health quoting for UAE SMEs is stuck in spreadsheets",
     "items": [
        ("Manual and slow", "Brokers reconcile employee censuses by hand in Excel and email premiums back and forth. Deals take days — and leak to whoever answers first."),
        ("Compliance is hard", "DHA, DOH and MOHAP rules differ by emirate and freezone. A missed co-pay or maternity clause can void a submission."),
        ("Dirty data stalls deals", "Missing Emirates IDs, dates of birth and salary bands block underwriting. Most tools never catch it before pricing."),
        ("Disconnected systems", "Census, CRM, policy admin and payments live in silos, so every quote is re-keyed by hand."),
     ]},

    {"kind": "grid", "eyebrow": "Why now", "title": "The market rewards a compliant, automated pipeline",
     "cols": 2,
     "cards": [
        ("Mandated cover", "Group medical insurance is mandatory for SMEs across UAE emirates — every licensed broker needs a repeatable quoting pipeline."),
        ("Scale pressure", "Thousands of SMEs renew each year. Manual quoting cannot meet the volume or the “in seconds” expectation."),
        ("Regtech tailwind", "CBUAE oversight, data-residency and KYC expectations reward auditable, compliance-by-design engines."),
        ("AI that is safe", "LLMs are now reliable enough to assist reconciliation — when grounded in deterministic rules, not vibes."),
     ]},

    {"kind": "grid", "eyebrow": "Our solution", "title": "An AI-assisted, compliance-first engine: census → quote",
     "cols": 3,
     "cards": [
        ("Ingest & reconcile", "Parse any Excel/CSV census, auto-derive Emirates-ID facts, and surface every blocking issue before pricing."),
        ("Price with rules", "A deterministic rating engine plus jurisdiction compliance checks produce an auditable, VAT-accurate premium."),
        ("Close the loop", "Versioned quotes, one-click bind to a real Salesforce Opportunity, payment collection and policy issuance."),
     ]},

    {"kind": "flow", "eyebrow": "How it works", "title": "One pipeline, every stage automated",
     "steps": ["Upload census", "Parse & validate", "Auto-fix & flag", "Compliance check", "Rate & configure", "Budget solver", "Versioned quote", "Bind → CRM / policy"],
     "caption": "Every stage runs through the same engines the public API exposes — there are no hidden manual steps."},

    {"kind": "bullets", "eyebrow": "Step 1", "title": "Census ingestion & reconciliation",
     "items": [
        ("Any layout, mapped", "Flexible column mapping with an “unmapped columns” report — no rigid template forced on the broker."),
        ("Emirates-ID intelligence", "Derives date of birth, gender and age from the Emirates ID pattern, and flags mismatches automatically."),
        ("Auto-fix vs human desk", "Salaries, relationships and duplicates resolve automatically; genuinely ambiguous lives route to the underwriter desk."),
        ("Live quality score", "A data-quality score tells the broker exactly how close the census is to being priceable."),
     ]},

    {"kind": "grid", "eyebrow": "Step 2", "title": "Compliance is built in, not bolted on",
     "cols": 3,
     "cards": [
        ("DHA · Dubai", "Network and co-pay caps enforced for Dubai (DHA) submissions."),
        ("DOH · Abu Dhabi", "Pharmacy-limit and emirate-specific clauses for DOH."),
        ("MOHAP · North", "Northern-Emirates rules applied by jurisdiction."),
        ("Chronic-care cover", "30-day chronic medication continuity clause."),
        ("Emirates-ID KYC", "Identity completeness checked before the quote is issued."),
        ("CBUAE & residency", "Data-residency and privacy disclosures derived from live config."),
     ]},

    {"kind": "bullets", "eyebrow": "Step 3", "title": "Deterministic pricing & a budget solver",
     "items": [
        ("Transparent rating", "Per-life breakdown, VAT, policy fee and monthly-per-employee — every dirham is traceable."),
        ("Instant configurator", "Tier, co-pay, pharmacy limit and riders re-rate live, with compliance guardrails applied automatically."),
        ("Budget-target search", "Give a ceiling — “under AED 40k a month” — and the solver finds the best-coverage compliant plan, or explains the shortfall."),
        ("Renewal engine", "Age the whole population by a year and re-rate: a renewal is the same engine run forward twelve months."),
     ]},

    {"kind": "bullets", "eyebrow": "Step 4", "title": "A copilot that never dead-ends",
     "items": [
        ("Grounded in the live census", "Ask for status, open issues, who needs review, or a budget quote — answered from real engine output."),
        ("LLM when configured", "Groq Llama-3.3-70b handles free-text questions with a strict, data-only system prompt."),
        ("Deterministic fallback", "With no API key, a rule engine answers the same intents — the demo can never break on a missing model."),
        ("Fully bilingual", "Replies in English or Arabic, matching the active UI locale."),
     ]},

    {"kind": "grid", "eyebrow": "Integrations", "title": "Contract-first, live-ready — no fake connections",
     "cols": 4,
     "cards": [
        ("Salesforce CRM", "Creates and updates a real Opportunity; binding sets it to Closed Won — verified against a live org."),
        ("Payments", "Raises a collection intent automatically on bind."),
        ("Rating platform", "Posts the rating inputs for authoritative re-rating when an engine is configured."),
        ("Policy admin", "Issues the policy record the moment a quote is bound."),
     ],
     "footnote": "Env-gated adapters: configured → a real call; unconfigured → the exact contract it would send. Secrets are never exposed."},

    {"kind": "bullets", "eyebrow": "Backend", "title": "A real, multi-tenant product — not a demo",
     "items": [
        ("Supabase Auth", "Password and magic-link sign-in; the caller’s identity is verified on every API request."),
        ("Durable per-broker workspace", "Each broker’s census, config, documents and version history persist server-side — they survive a cache clear, a device switch or a new browser."),
        ("Append-only audit trail", "Every action is recorded, idempotent on replay, and cascade-safe when a user is removed."),
        ("Honest analytics", "Funnel, conversion and turnaround are computed from the live quote ledger — never synthetic numbers."),
     ]},

    {"kind": "bullets", "eyebrow": "Reach", "title": "Built for the UAE market",
     "items": [
        ("English + Arabic", "Full right-to-left layout with mirrored UI and proper Arabic typography."),
        ("Localized engine output", "Compliance findings, notifications and issues render in the active locale — not just the chrome."),
        ("Works on a shared terminal", "Session-scoped by default; signed-in brokers get their own durable, private workspace."),
     ]},

    {"kind": "grid", "eyebrow": "Why we win", "title": "Differentiators that are hard to copy",
     "cols": 2,
     "cards": [
        ("Honest by design", "No fabricated data, no fake badges, no pretend OCR. Every number on screen traces to a real engine — which is exactly what a regulated insurer needs."),
        ("Compliance-first", "Jurisdiction rules and governance are the core of the engine, not a checkbox added at the end."),
        ("Seconds, not days", "The whole path from upload to a bindable, CRM-synced quote is automated."),
        ("API-first", "Thirteen documented endpoints; the web UI is just one client of the same engine."),
     ]},

    {"kind": "metrics", "eyebrow": "Proof", "title": "Engineered and verified",
     "stats": [("13", "API endpoints"), ("7", "Postgres tables · RLS"), ("2", "Languages · EN/AR"), ("4", "Integration seams"), ("3", "Regulators covered")],
     "footnote": "Production build green  ·  typecheck & lint clean  ·  live Salesforce bind verified  ·  live Supabase workspace round-trip verified."},

    {"kind": "bullets", "eyebrow": "What’s next", "title": "Roadmap & the ask",
     "items": [
        ("Now", "Theme 2 engine is complete and verified end-to-end — census to bound policy."),
        ("Next", "Deeper insurer rate tables, document OCR, multi-tenant broker organisations, and a production deployment."),
        ("The ask", "Pilot SMEs, an underwriting data partner, and a path to production on the Cigna technology stack."),
     ]},

    {"kind": "closing",
     "title": "AuraSME",
     "subtitle": "Quote in seconds. Bind with confidence.",
     "footer": "Cigna × Ignyte — Quote in Seconds Challenge · Theme 2"},
]

# ============================ PPTX RENDERER ===============================
def build_pptx(path):
    from pptx import Presentation
    from pptx.util import Inches, Pt, Emu
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.oxml.ns import qn

    def C(t): return RGBColor(*t)
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    SW, SH = 13.333, 7.5
    blank = prs.slide_layouts[6]
    FONT = "Calibri"

    def rect(s, x, y, w, h, color, line=None, shape=MSO_SHAPE.RECTANGLE, radius=None):
        sp = s.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
        sp.fill.solid(); sp.fill.fore_color.rgb = C(color)
        if line: sp.line.color.rgb = C(line); sp.line.width = Pt(1)
        else: sp.line.fill.background()
        sp.shadow.inherit = False
        if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE:
            try: sp.adjustments[0] = radius
            except Exception: pass
        return sp

    def text(s, x, y, w, h, runs, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spc_after=0):
        tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        tf = tb.text_frame; tf.word_wrap = True
        tf.vertical_anchor = anchor
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        if isinstance(runs, str): runs = [(runs, 18, INK, False)]
        for i, (txt, size, color, bold) in enumerate(runs):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.alignment = align
            if spc_after: p.space_after = Pt(spc_after)
            r = p.add_run(); r.text = txt
            r.font.size = Pt(size); r.font.bold = bold; r.font.name = FONT
            r.font.color.rgb = C(color)
        return tb

    def footer(s, n, dark=False):
        col = (150, 170, 190) if dark else MUTED
        text(s, 0.6, SH-0.5, 6, 0.3, [("AuraSME  ·  SME Quoting at Scale", 10, col, False)])
        text(s, SW-1.6, SH-0.5, 1.0, 0.3, [(str(n), 10, col, False)], align=PP_ALIGN.RIGHT)

    def header(s, eyebrow, title):
        rect(s, 0, 0, SW, 0.18, TEAL)
        if eyebrow: text(s, 0.6, 0.5, 12, 0.3, [(eyebrow.upper(), 12, TEAL, True)])
        text(s, 0.6, 0.82, 12.1, 0.9, [(title, 30, NAVY, True)])
        rect(s, 0.62, 1.62, 1.5, 0.05, AMBER)

    n = 0
    for sl in DECK:
        n += 1
        s = prs.slides.add_slide(blank)
        k = sl["kind"]

        if k == "cover":
            rect(s, 0, 0, SW, SH, NAVY)
            rect(s, 0, 0, SW, SH, DEEP)  # base
            rect(s, 0, 2.55, SW, 0.06, TEAL)
            text(s, 1.0, 2.9, 11.3, 1.6, [(sl["title"], 76, WHITE, True)])
            text(s, 1.0, 4.35, 10.5, 0.9, [(sl["subtitle"], 22, (200, 220, 235), False)])
            pill = rect(s, 1.0, 5.5, 8.2, 0.6, TEAL, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5)
            text(s, 1.3, 5.62, 7.8, 0.4, [(sl["badge"], 14, WHITE, True)])
            text(s, 1.0, 6.7, 11, 0.4, [(sl["footer"], 13, (150, 175, 200), False)])

        elif k == "closing":
            rect(s, 0, 0, SW, SH, NAVY)
            rect(s, 0, 3.0, SW, 0.06, TEAL)
            text(s, 1.0, 3.3, 11.3, 1.4, [(sl["title"], 66, WHITE, True)])
            text(s, 1.0, 4.55, 11, 0.8, [(sl["subtitle"], 26, TEAL, True)])
            text(s, 1.0, 6.7, 11, 0.4, [(sl["footer"], 13, (150, 175, 200), False)])

        elif k == "bullets":
            header(s, sl.get("eyebrow"), sl["title"])
            y = 2.05
            for head, body in sl["items"]:
                rect(s, 0.62, y+0.06, 0.12, 0.12, AMBER, shape=MSO_SHAPE.OVAL)
                text(s, 0.95, y-0.05, 11.7, 0.4, [(head, 18, NAVY, True)])
                text(s, 0.95, y+0.32, 11.6, 0.7, [(body, 14.5, INK, False)])
                y += 1.18
            footer(s, n)

        elif k == "grid":
            header(s, sl.get("eyebrow"), sl["title"])
            cards = sl["cards"]; cols = sl.get("cols", 3)
            rows = (len(cards)+cols-1)//cols
            gap = 0.28
            top = 2.05
            bottom = 0.7 + (0.5 if sl.get("footnote") else 0.0)
            cw = (SW-1.2 - gap*(cols-1))/cols
            ch = min((SH-bottom-top - gap*(rows-1))/rows, 2.1)
            block_h = rows*ch + (rows-1)*gap
            y_start = top + ((SH-bottom-top) - block_h)/2  # vertically centre the grid
            for i, (head, body) in enumerate(cards):
                r, c = divmod(i, cols)
                x = 0.6 + c*(cw+gap); yy = y_start + r*(ch+gap)
                rect(s, x, yy, cw, ch, LIGHT, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06)
                rect(s, x, yy, 0.12, ch, TEAL)
                text(s, x+0.32, yy+0.22, cw-0.5, 0.5, [(head, 16, NAVY, True)])
                text(s, x+0.32, yy+0.72, cw-0.5, ch-0.9, [(body, 12.5, INK, False)])
            if sl.get("footnote"):
                text(s, 0.6, SH-0.95, 12.1, 0.5, [(sl["footnote"], 11.5, MUTED, False)])
            footer(s, n)

        elif k == "flow":
            header(s, sl.get("eyebrow"), sl["title"])
            steps = sl["steps"]
            per = 4; gap = 0.35
            rows = (len(steps)+per-1)//per
            cw = (SW-1.2 - gap*(per-1))/per
            top = 2.35; ch = 1.5; vgap = 0.5
            for i, st in enumerate(steps):
                r, c = divmod(i, per)
                # right-to-left on the second row for a snake feel
                cc = c if r % 2 == 0 else (per-1-c)
                x = 0.6 + cc*(cw+gap); yy = top + r*(ch+vgap)
                rect(s, x, yy, cw, ch, NAVY if r == 0 else (30,60,95), shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.08)
                text(s, x+0.2, yy+0.18, 0.8, 0.5, [(str(i+1), 22, AMBER, True)])
                text(s, x+0.2, yy+0.68, cw-0.4, 0.7, [(st, 14.5, WHITE, True)], anchor=MSO_ANCHOR.TOP)
            if sl.get("caption"):
                text(s, 0.6, SH-1.0, 12.1, 0.6, [(sl["caption"], 13, MUTED, False)])
            footer(s, n)

        elif k == "metrics":
            header(s, sl.get("eyebrow"), sl["title"])
            stats = sl["stats"]; cols = len(stats)
            gap = 0.3; cw = (SW-1.2 - gap*(cols-1))/cols
            top = 2.4; ch = 2.2
            for i, (val, lab) in enumerate(stats):
                x = 0.6 + i*(cw+gap)
                rect(s, x, top, cw, ch, LIGHT, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06)
                text(s, x, top+0.5, cw, 1.0, [(val, 52, TEAL, True)], align=PP_ALIGN.CENTER)
                text(s, x+0.15, top+1.5, cw-0.3, 0.6, [(lab, 13, NAVY, True)], align=PP_ALIGN.CENTER)
            text(s, 0.6, SH-1.0, 12.1, 0.6, [(sl["footnote"], 12.5, MUTED, False)], align=PP_ALIGN.CENTER)
            footer(s, n)

    prs.save(path)


# ============================ PDF RENDERER ================================
def build_pdf(path):
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas as pdfcanvas
    from reportlab.lib.colors import Color

    def col(t, a=1): return Color(t[0]/255, t[1]/255, t[2]/255, alpha=a)
    PW, PH = 960, 540  # 13.333x7.5 in at 72dpi
    c = pdfcanvas.Canvas(path, pagesize=(PW, PH))
    F = "Helvetica"; FB = "Helvetica-Bold"

    def rect(x, y, w, h, fill, stroke=None, r=0):
        c.setFillColor(col(fill))
        if stroke: c.setStrokeColor(col(stroke)); c.setLineWidth(1)
        if r: c.roundRect(x, y, w, h, r, stroke=1 if stroke else 0, fill=1)
        else: c.rect(x, y, w, h, stroke=1 if stroke else 0, fill=1)

    def txt(x, y, s, size, color, bold=False, align="l", maxw=None):
        c.setFillColor(col(color)); c.setFont(FB if bold else F, size)
        if align == "c":
            c.drawCentredString(x, y, s)
        elif align == "r":
            c.drawRightString(x, y, s)
        else:
            c.drawString(x, y, s)

    def wrap(s, size, bold, maxw):
        c.setFont(FB if bold else F, size)
        words = s.split(); lines = []; cur = ""
        for w in words:
            t = (cur+" "+w).strip()
            if c.stringWidth(t, FB if bold else F, size) <= maxw: cur = t
            else: lines.append(cur); cur = w
        if cur: lines.append(cur)
        return lines

    def block(x, y, s, size, color, bold, maxw, leading):
        for ln in wrap(s, size, bold, maxw):
            txt(x, y, ln, size, color, bold); y -= leading
        return y

    def _footer(idx):
        txt(44, 15, "AuraSME  ·  SME Quoting at Scale", 9.5, MUTED, False)
        txt(PW-44, 15, str(idx), 9.5, MUTED, False, align="r")

    n = len(DECK)
    for idx, sl in enumerate(DECK, 1):
        k = sl["kind"]
        if k == "cover":
            rect(0, 0, PW, PH, DEEP)
            rect(0, PH*0.62, PW, 4, TEAL)
            txt(72, PH*0.5, sl["title"], 66, WHITE, True)
            block(72, PH*0.5-44, sl["subtitle"], 20, (200,220,235), False, 760, 26)
            rect(72, 96, 640, 44, TEAL, r=8)
            txt(92, 112, sl["badge"], 14, WHITE, True)
            txt(72, 54, sl["footer"], 13, (150,175,200), False)
            c.showPage(); c.setFillColor(WHITE); continue

        if k == "closing":
            rect(0, 0, PW, PH, NAVY)
            rect(0, PH*0.55, PW, 4, TEAL)
            txt(72, PH*0.44, sl["title"], 60, WHITE, True)
            txt(72, PH*0.44-46, sl["subtitle"], 26, TEAL, True)
            txt(72, 54, sl["footer"], 13, (150,175,200), False)
            c.showPage(); continue

        # content pages share a header
        rect(0, PH-13, PW, 13, TEAL)
        if sl.get("eyebrow"): txt(44, PH-52, sl["eyebrow"].upper(), 12, TEAL, True)
        # title (wrap to 2 lines if long)
        ty = PH-84
        ty = block(44, ty, sl["title"], 28, NAVY, True, PW-88, 32)
        rect(44, ty+8, 108, 4, AMBER)
        top = ty - 26

        if k == "bullets":
            y = top - 6
            for head, body in sl["items"]:
                rect(46, y-6, 11, 11, AMBER)
                txt(68, y, head, 17, NAVY, True)
                y -= 22
                y = block(68, y, body, 13.5, INK, False, PW-120, 17) - 8
            _footer(idx)

        elif k == "grid":
            cards = sl["cards"]; cols = sl.get("cols", 3)
            rows = (len(cards)+cols-1)//cols
            gap = 20; area_top = top - 4
            foot = 56 if sl.get("footnote") else 34
            cw = (PW-88 - gap*(cols-1))/cols
            ch = min((area_top - foot - gap*(rows-1))/rows, 150)
            block_h = rows*ch + (rows-1)*gap
            y_top = foot + ((area_top - foot) - block_h)/2 + block_h  # vertically centre the grid
            for i, (head, body) in enumerate(cards):
                r, cc = divmod(i, cols)
                x = 44 + cc*(cw+gap)
                y = y_top - ch - r*(ch+gap)
                rect(x, y, cw, ch, LIGHT, r=8)
                rect(x, y, 8, ch, TEAL)
                txt(x+24, y+ch-30, head, 15, NAVY, True)
                block(x+24, y+ch-54, body, 11.5, INK, False, cw-40, 15)
            if sl.get("footnote"):
                block(44, 40, sl["footnote"], 11, MUTED, False, PW-88, 14)
            _footer(idx)

        elif k == "flow":
            steps = sl["steps"]; per = 4
            rows = (len(steps)+per-1)//per
            gap = 24; cw = (PW-88 - gap*(per-1))/per; ch = 96; vgap = 34
            top2 = top - 20
            for i, st in enumerate(steps):
                r, cc = divmod(i, per)
                cc2 = cc if r % 2 == 0 else (per-1-cc)
                x = 44 + cc2*(cw+gap); y = top2 - ch - r*(ch+vgap)
                rect(x, y, cw, ch, NAVY if r == 0 else (30,60,95), r=10)
                txt(x+18, y+ch-34, str(i+1), 24, AMBER, True)
                block(x+18, y+ch-58, st, 13.5, WHITE, True, cw-30, 16)
            if sl.get("caption"):
                block(44, 42, sl["caption"], 12.5, MUTED, False, PW-88, 15)
            _footer(idx)

        elif k == "metrics":
            stats = sl["stats"]; cols = len(stats); gap = 22
            cw = (PW-88 - gap*(cols-1))/cols; ch = 150; top2 = top - 30
            for i, (val, lab) in enumerate(stats):
                x = 44 + i*(cw+gap); y = top2 - ch
                rect(x, y, cw, ch, LIGHT, r=8)
                txt(x+cw/2, y+ch-72, val, 46, TEAL, True, align="c")
                block(x+12, y+ch-104, lab, 12.5, NAVY, True, cw-24, 15) if False else txt(x+cw/2, y+ch-104, lab, 12.5, NAVY, True, align="c")
            txt(PW/2, 40, sl["footnote"], 12, MUTED, False, align="c")
            _footer(idx)

        c.showPage()
    c.save()

def _footer(idx):
    txt(44, 22, "AuraSME  ·  SME Quoting at Scale", 9.5, MUTED, False)
    txt(PW-44, 22, str(idx), 9.5, MUTED, False, align="r")

# ============================ main ========================================
if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    pptx_path = os.path.join(here, "AuraSME_Pitch_Deck.pptx")
    pdf_path = os.path.join(here, "AuraSME_Pitch_Deck.pdf")
    build_pptx(pptx_path)
    build_pdf(pdf_path)
    for p in (pptx_path, pdf_path):
        print(p, "%.1f KB" % (os.path.getsize(p)/1024))
