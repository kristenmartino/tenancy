# Status

> **Active focus:** bbox overlay v2 just shipped ([#14](https://github.com/kristenmartino/tenancy/issues/14)) — text-layer matcher gone, click-to-highlight drives off `source.bbox` from the backend. Last `Next 3` item is the demo recording.

> **Open question:** none in flight.

## Next 3

1. **[#1]** Interactive exception resolve UI (approve / edit / reject) — ✅ shipped ([#16](https://github.com/kristenmartino/tenancy/pull/16))
2. **[#2]** Q&A panel using existing `/leases/{id}/query` endpoint — ✅ shipped
3. **[tenancy-api#2]** Record 60-90s demo video for the case study — `now` `effort-day`

## Later

- **Mobile-first layout pass** — side-by-side breaks below ~900px today
- **Bulk operations** on the lease list (approve-all, filter by status)
- **Better empty / loading / error states** across the board
- **Multi-tenant theming** (organization branding, custom colors)
- **Re-extraction diff view**
- **[tenancy-api#17]** v3 highlight: AWS Textract for production-grade bbox accuracy (~99%). Promote when the vision-bbox approach (~80%) is the bottleneck.

## Blocked on

Nothing in flight.

## Recent decisions

- **Bbox overlay v2** ([#14](https://github.com/kristenmartino/tenancy/issues/14)) — removed the text-layer matcher (normalize-map fuzzy search, span-tinting, the 12+ heuristic iterations) and the PDF.js text layer + cmap config that fed it. On click, the viewer reads `source.bbox` (normalized 0-1 coords from Sonnet vision) and renders an absolutely-positioned overlay over the page canvas at the bbox's pixel rect. Falls back to page-jump-only when bbox is missing (old leases, Q&A citations). Production-grade accuracy is v3 (AWS Textract, [tenancy-api#17](https://github.com/kristenmartino/tenancy-api/issues/17)).
- **Strict highlight matcher v1** ([#13](https://github.com/kristenmartino/tenancy/pull/13)) — replaced 12+ iterations of fuzzy text matching with exact-normalized-match only. Silent failures preferred over wrong-place highlights. Now superseded by bbox overlay v2 above.
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
