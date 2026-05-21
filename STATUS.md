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
- **Cache-bust PDF URL with `?v={updated_at}` + `key={updated_at}` on PdfViewer** — fixed the cached-404 problem where react-pdf wouldn't retry after the initial pending-state load failed.
- **`Cache-Control: no-store` on backend 404s** — companion fix so browsers don't cache transient 404s during the pending window.
- **Graceful error boundary on every server-side fetch** — prevents Vercel's generic 500 page from appearing on transient backend hiccups.
- **Server components everywhere except where state requires client** — `LeaseDetailLayout`, `UploadForm`, `PdfViewer*` are the only `"use client"` components.
- **React Context for the field-click → PDF-highlight signal** — beats prop-drilling through 4 layers of section/list/row components.
- **Dynamic import of `PdfViewer` with `ssr: false`** — `pdfjs-dist` touches browser-only APIs at module load.
- **CDN-hosted PDF.js worker (unpkg)** — cdnjs lagged the bundled version; unpkg proxies npm so any version is available.

## Velocity

High but slowing. Frontend work converging on the last interactivity items before demo recording.

## Audience class

Portfolio / case study now. Productize-to-sell secondary path same as the API.

## Repos

- This repo: `kristenmartino/tenancy` (Next.js 16 frontend on Vercel)
- Backend + MCP: [`kristenmartino/tenancy-api`](https://github.com/kristenmartino/tenancy-api)

Shared project board: https://github.com/users/kristenmartino/projects/2 — spans both repos so cross-repo deps (like #14 → tenancy-api#16) are visible in one place.
