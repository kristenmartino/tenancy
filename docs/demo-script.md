# Demo script — Tenancy lease abstraction agent

**Length:** 60–90s.
**Goal:** Land the case study. Show real work + the human-in-the-loop story.
**Audience:** Recruiters, engineering hiring managers, a small slice of prop-tech prospects.

**Recording:**
- Desktop, 1440×900 viewport.
- Record from production (`tenancy-opal.vercel.app`), not local dev — avoids the Next.js Dev Tools floating button.
- Lock browser to light mode so the theme doesn't flip mid-take.
- Source lease: `45314996-bed0-41fe-ac67-3232476894ac` (San Antonio TAA template, OCR-anchored bboxes verified end-to-end).

---

## Shot list

| # | t | Beat | Screen action | Voice |
|---|---|---|---|---|
| 1 | 0–4s | **Open** | Home page on `tenancy-opal.vercel.app`. Cursor hovers "Tenancy" header. | "Tenancy is a lease abstraction agent." |
| 2 | 4–10s | **Drop a PDF** | Click into the URL field, paste a sample TAA URL, click **Extract**. Lease appears in the table with status `pending`. Cut. | "Drop a PDF…" |
| 3 | 10–14s | **Cut to complete** | Same lease, status now `complete`, `8 exceptions`. Click the source link to open detail. | "…and 25 seconds later, the structured extraction." |
| 4 | 14–22s | **Side-by-side reveal** | Lease detail loads. Slow-pan the right column: Parties → Property → Term → Rent → Deposits → Utilities → Pets → Special Clauses → Compliance. Confidence chips visible. | "Nine sections, every field carries a confidence and a source citation." |
| 5 | 22–34s | **Click-to-highlight** ⭐ | Click `property.street_address` ("1621 James Ave"). PDF jumps to page 1, yellow overlay lands on the "at 1621 James Ave Waco, Texas 76706" line. Click `parties[1].address` — overlay becomes two stacked rects on page 8 (multi-line address). Click `rent.base_monthly_rent` (blank) — three small overlays land on the labeled blank line in section 6, **not** the section header above it. | "Click a field, see the source. OCR-anchored coordinates — multi-line addresses render Word-style, blank-template fields anchor on the blank line, not the section header above." |
| 6 | 34–50s | **Exception queue** | Scroll to Exceptions. Show `term.start_date` blocking exception ("required but value is null"). Click **Edit**, type `2018-01-01`, click Save. Row updates with corrected value inline. | "Anything ambiguous gets flagged for human review. The 'Date of Lease Contract' cell on page one says January 1st 2018, but the start-date blank in section 3 is empty — so we resolve it ourselves. Approve, edit, or reject — and the resolved value writes back into the extraction." |
| 7 | 50–65s | **Q&A** | Scroll to Q&A. Click the canned **"Any flagged exceptions?"** prompt OR type **"Are pets allowed?"**. Answer renders with citations. Click a citation chip — PDF jumps to page 20 and highlights. | "And Q&A on top — grounded against the extracted fields, with citations that click through to the PDF. The answer points at the Animal Addendum on page 20." |
| 8 | 65–80s | **Architecture beat** | Cut to a static card (make in Figma/Keynote): "Next.js 16 · FastAPI · LangGraph · Claude Sonnet 4.6 + Haiku 4.5 · OCR-anchored bboxes via pdfplumber · Postgres". | "Next.js front end, FastAPI plus LangGraph back end. Claude Sonnet for extraction, Claude Haiku for Q&A. Bbox coordinates come from pdfplumber's OCR positions — not the model — which is what made the highlights pixel-tight." |
| 9 | 80–90s | **Outro** | Final card with `github.com/kristenmartino/tenancy` + `github.com/kristenmartino/tenancy-api`. Cursor static. | "Source on GitHub. Both repos." |

**Total: ~85s.** Trim shot 4 to 6s or shot 6 to 12s if you need to hit 60s.

---

## Why these specific demo choices

- **Why this lease (`45314996`):** OCR-anchored bboxes verified end-to-end on it (see [PR #18 comment](https://github.com/kristenmartino/tenancy/pull/18#issuecomment-4511474726)). Filled fields land pixel-tight; multi-line `parties[1].address` shows the Word-style stacking; blank-template `rent.base_monthly_rent` shows the section-header-drift fix.
- **Why shot 5 clicks those three fields:** They're the three behaviors the bbox pivot was designed to nail — filled / multi-line / blank-template. Showing all three in 12 seconds tells the engineering story without narration.
- **Why shot 6 edits `term.start_date`:** The PDF visibly shows "Date of Lease Contract: January 1, 2018" — which is a related but different cell from the section-3 start-date blank. Editing the start date to `2018-01-01` is the strongest human-in-the-loop moment in the demo (human reads the related cell, infers the missing value).
- **Why shot 7 asks about pets (not rent):** Rent is blank in this template lease, so "What is the rent?" returns "rent field is blank" — not a clean Q&A demo. "Are pets allowed?" returns a detailed grounded answer with citations to the Animal Addendum on page 20.
- **Why no architecture diagram beyond a text card:** A 5-second architecture flash gives the engineering audience enough; longer architecture is a separate writeup, not a 90s demo.

---

## Pre-record checklist

- [ ] Source lease `45314996` is still loading correctly in production (or pick a fresh one and update the script).
- [ ] Browser locked to light mode (`prefers-color-scheme: light` via system settings or browser flag).
- [ ] Recording from production Vercel (not local `npm run dev`) so the Next.js Dev Tools button isn't on screen.
- [ ] Static cards for shot 8 + shot 9 prepared in Figma/Keynote at 1440×900.
- [ ] One full dry run before record.

## Surfaces the demo touches (polish targets)

- Home page header + URL upload tab + lease table row
- Lease detail page: PDF viewer + Extraction panel (all 9 sections) + Exception row edit flow + Q&A panel
- Two static cards (shot 8 + 9) — Figma, not the app

## Surfaces the demo skips — no polish needed

- Mobile layout (already responsive; not in record)
- Empty / loading / error states (no empty leases, no error paths shown)
- Upload PDF file tab (only URL tab is used)
- Bulk operations (per "case study then stop")
- Re-extraction diff view
- Q&A canned prompt "What is the rent?" (rent is blank in this lease — answer is "blank")

---

## After recording

- Drop the 60-90s mp4 in `tenancy-web/docs/demo.mp4` (or host on Loom / Vimeo and link).
- Add a thumbnail + play link to `tenancy-web/README.md` top section.
- Mirror the same link from `tenancy-api/README.md`.
- Close out the Next 3 demo item in both `STATUS.md` files.
- That's the case-study deliverable. Stop.
