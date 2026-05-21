# Status

> **Active focus:** v2 highlight pivoted from LLM-emitted bboxes to OCR-anchored derivation (mirrors backend [tenancy-api#26](https://github.com/kristenmartino/tenancy-api/pull/26)). Sonnet's bbox accuracy hit a 3-8% positional ceiling on filled values + section-header drift on blank-template fields; research across docTR / Surya / PaddleOCR / Textract / Mindee / Landing.AI converged on the same pattern (OCR-first for geometry, model-second for semantics). Backend now strips bbox from Sonnet's contract and derives per-line rects from pdfplumber's word positions. Frontend renders an array of overlays (PDF QuadPoints model). Demo recording is the last item.

> **Open question:** none in flight.

## Next 3

1. **[#14]** Bbox overlay pivot — per-line array renderer over OCR-anchored backend coords. Supersedes [#18](https://github.com/kristenmartino/tenancy/pull/18) and [#20](https://github.com/kristenmartino/tenancy/pull/20).
2. **[tenancy-api#2]** Record 60-90s demo video for the case study — `now` `effort-day`
3. **[#3]** Re-verify click-to-highlight end-to-end on a freshly uploaded lease post-pivot.

## Later

- **Mobile-first layout pass** — side-by-side breaks below ~900px today
- **Bulk operations** on the lease list (approve-all, filter by status)
- **Better empty / loading / error states** across the board
- **Multi-tenant theming** (organization branding, custom colors)
- **Re-extraction diff view**
- **[tenancy-api#17]** v3 highlight: AWS Textract for production-grade checkbox/signature geometry. Promote when the OCR-anchored path's coverage gap (visual-only fields) bottlenecks the demo.

## Blocked on

Nothing in flight.

## Recent decisions

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

Settling into v2 polish. Backend and frontend interactivity both feature-complete for V0. Remaining V0 work is the bbox-overlay pivot landing end-to-end, then demo recording.

## Audience class

Portfolio / case study now. Productizing optional second phase if the demo lands meetings.

## Repos

- Backend + MCP: this repo (`kristenmartino/tenancy-api`)
- Frontend: [`kristenmartino/tenancy`](https://github.com/kristenmartino/tenancy)

Both deploy independently (Railway for backend, Vercel for frontend). STATUS.md and CLAUDE.md are mirrored to the frontend repo. Shared user-level Project board: https://github.com/users/kristenmartino/projects/2 — spans both repos so cross-repo deps (e.g. tenancy#14 ↔ tenancy-api#16 for v2 highlights) are visible in one view.
