# Status

> **Active focus:** V2 highlight (OCR-anchored bbox overlay) **shipped and production-verified** end-to-end ([tenancy#18](https://github.com/kristenmartino/tenancy/pull/18) + backend [tenancy-api#26](https://github.com/kristenmartino/tenancy-api/pull/26)). Per-line `bboxes` array from pdfplumber alignment; multi-rect renderer in `PdfViewer.tsx`. Filled fields pixel-tight, multi-line values Word-style, blank-template fields anchored on the labeled blank line. Highlight saga closed. Only V0 item remaining: record the 60-90s demo. Case study is the deliverable; productize gates explicitly out of scope.

> **Open question:** none in flight.

## Next 3

1. **[tenancy-api#2]** Record 60-90s demo video for the case study (`effort-day`) — final V0 item. Backend + frontend feature-complete; bbox overlay production-verified.
2. **Demo-prep polish** (`effort-day`) — mobile-first layout pass (side-by-side breaks below ~900px), empty / loading / error states consistent across the demo path, confidence-chip tooltip.
3. **README + case-study writeup pass** (`effort-day`) — methodology section: the bbox pivot narrative (Sonnet emission → OCR alignment), eval observations, links to the PRs that document the reasoning.

## Later

- **Bulk operations** on the lease list (approve-all, filter by status)
- **Multi-tenant theming** (organization branding, custom colors)
- **Re-extraction diff view**
- **[tenancy-api#17]** v3 highlight: AWS Textract `SELECTION_ELEMENT` for checkbox/signature geometry. Promote only when a customer demands it — current "missing > wrong" behavior on those field classes is the documented design call.

_(Mobile-first layout pass + empty / loading / error states promoted into the demo-prep polish item in Next 3.)_

## Blocked on

Nothing in flight.

## Recent decisions

- **Bbox overlay v2 production-verified** ([#18](https://github.com/kristenmartino/tenancy/pull/18) + [tenancy-api#26](https://github.com/kristenmartino/tenancy-api/pull/26)) — OCR-anchored per-line bboxes verified end-to-end on fresh lease `45314996` (2026-05-21): `property.street_address` lands pixel-tight on the "at 1621 James Ave Waco, Texas 76706" line at `y≈0.93`, `parties[1].address` renders as 2 stacked rects (Word-style multi-line), `rent.base_monthly_rent` (blank-template) shows 3 rects on the labeled blank line rather than the section header. User confirmed live: "everything highlighted is correct. some things don't highlight." The missing-highlight cases (checkboxes, signatures, hand-fill) fall under the deferred Textract v3 path, not a renderer issue. The 12+ matcher-iteration + LLM-bbox detour saga is closed.
- **OCR-anchored bbox pivot (v2 architecture)** — first real test of Sonnet-emitted bboxes (the original v2) showed ~3-8% positional drift on filled values and Sonnet bboxing entire section headers when the field was a blank-template placeholder. Research across docTR / Surya / PaddleOCR / unstructured / Textract / Mindee / Landing.AI converged unanimously: OCR-first for geometry, model-second for semantics. Donut, the only mainstream system that asks the model to emit coords from a raster, has a documented ~11.5% hallucination rate. Backend now strips bbox from Sonnet's response contract; Sonnet returns `{value, snippet, page_number, match_type, section_label}`; backend aligns snippet against pdfplumber's word positions and emits one `BoundingBox` per line (PDF QuadPoints model — what Adobe/Mendeley do). Frontend: `FieldHighlight.bbox` → `bboxes: BoundingBox[]`; PdfViewer renders an array of absolutely-positioned overlay divs, one per line. The old single-bbox renderer (PR [#18](https://github.com/kristenmartino/tenancy/pull/18), parallel session's PR [#20](https://github.com/kristenmartino/tenancy/pull/20)) is superseded. Checkbox geometry deferred to a Textract follow-up — match_type=checkbox returns empty `bboxes` for now (page navigates, no overlay).
- **Strict highlight matcher v1** ([#13](https://github.com/kristenmartino/tenancy/pull/13)) — 12+ iterations of fuzzy text matching, retreated to exact-normalized-match only. Now fully superseded by the OCR-anchored backend approach.
- **Resolve endpoint actions are now distinct** ([tenancy-api#22](https://github.com/kristenmartino/tenancy-api/issues/22)) — pre-change, all three of `approve | edit | reject` were pure metadata on the exception row; nothing read `BLOCKING` downstream and `edit` never rewrote `lease.extraction`. Now: `edit` walks the extraction JSON to `exc.field_path` and replaces the leaf `.value` (confidence bumped to 1.0); `approve` clears the blocker without touching the extraction; `reject` closes the row but keeps the blocking flag material via a derived `ready_to_proceed: bool` returned on every lease (`status == "complete"` AND no blocking exception unresolved-or-rejected). Typed `Correction(value, note?)` model so the frontend's `{"value": "<text>"}` payload is validated instead of stored as opaque dict. Deferred: re-running `validate_extraction` after an edit (e.g. user fixes `end_date` to something that still violates the date-order rule) — would need to surface new exceptions in the resolve response, bigger UX shape, revisit if it bites.
- **Exception resolve UI + Q&A panel shipped** ([tenancy#1](https://github.com/kristenmartino/tenancy/issues/1), [tenancy#2](https://github.com/kristenmartino/tenancy/issues/2)) — both former Next 3 items closed in parallel sessions. Frontend interactivity is now feature-complete for V0. The resolve UI consumes the refined approve/edit/reject semantics from tenancy-api#22 above; Q&A panel posts to `/leases/{id}/query` (the 502-on-long-answers bug fixed in PR [#20](https://github.com/kristenmartino/tenancy-api/pull/20) was the prerequisite).
- **Page images attached to every extraction call** — fixed the false-positive checkbox class of bug (Tesseract OCR reads scan noise as a stray mark → LLM trusts the OCR'd text and reports the box as checked). Render every page to a PNG at 150 DPI via `pypdfium2` (no system deps) and attach as image blocks alongside the OCR'd text on each of the 9 section calls. Prompt updated to tell the model: image is ground truth for visual fields (checkboxes, signatures, hand-fill), OCR is ground truth for dense text. Replaces the prior `document`-block fallback that only triggered when text extraction was incomplete on a page — the bug shape was OCR'ing successfully but mis-reading the marks, so the gate never fired. Image-token cost goes up vs the document-block path (PNG per page per section call), considered acceptable for the precision win — caching the image prefix across section calls is the obvious next optimization if cost shows up in invoices.
- **Q&A `max_tokens` bumped 1024 → 4096** — Haiku was truncating mid-JSON on long answers (e.g. "list all flagged exceptions"), producing 502s on `/leases/{id}/query`. Cheapest fix; Haiku 4.5 input is far larger than the extraction so the cost delta is negligible. Proper structural fix (Anthropic tool-use so the JSON envelope is guaranteed valid) deferred — only worth doing if we see the cap hit again or want to drop the manual `_strip_fences` parse.
- **Cache-bust PDF URL with `?v={updated_at}` + `key={updated_at}` on PdfViewer** — fixed the cached-404 problem where react-pdf wouldn't retry after the initial pending-state load failed.
- **`Cache-Control: no-store` on backend 404s** — companion fix so browsers don't cache transient 404s during the pending window.
- **Graceful error boundary on every server-side fetch** — prevents Vercel's generic 500 page from appearing on transient backend hiccups.
- **Server components everywhere except where state requires client** — `LeaseDetailLayout`, `UploadForm`, `PdfViewer*` are the only `"use client"` components.
- **React Context for the field-click → PDF-highlight signal** — beats prop-drilling through 4 layers of section/list/row components.
- **Dynamic import of `PdfViewer` with `ssr: false`** — `pdfjs-dist` touches browser-only APIs at module load.
- **CDN-hosted PDF.js worker (unpkg)** — cdnjs lagged the bundled version; unpkg proxies npm so any version is available.

## Velocity

V0 is feature-complete. Bbox overlay v2 shipped and production-verified. Only remaining V0 item is the demo recording itself; after that, the case-study deliverable is done. Productize gates (auth, eval set, queue, observability) explicitly deferred.

## Audience class

Portfolio / case study now. Productizing optional second phase if the demo lands meetings.

## Repos

- Frontend: this repo (`kristenmartino/tenancy`, Next.js 16 on Vercel)
- Backend + MCP: [`kristenmartino/tenancy-api`](https://github.com/kristenmartino/tenancy-api) (FastAPI on Railway)

Both deploy independently. STATUS.md mirrors between the two repos with framing differences. Shared user-level Project board: https://github.com/users/kristenmartino/projects/2 — spans both repos so cross-repo work (e.g. v2 highlights = tenancy#14 + tenancy-api#16) is visible in one view.
