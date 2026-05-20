# Status

> **Active focus:** filling in the interactive review surfaces that the API already supports. Exception resolve and Q&A both exist as endpoints (and work via the MCP server) but are invisible in the UI. The UI is still demo-only — clicking through doesn't actually let a human do the workflow the README pitches.

> **Open question:** none right now — backend has the open questions (OCR deploy, choice of next vertical). Surface here if a UI architecture call comes up.

## Next 3

1. **[#1]** Interactive exception resolve UI (approve / edit / reject) — `now` `effort-day`
2. **[#2]** Q&A panel using existing `/leases/{id}/query` endpoint — `now` `effort-day`
3. **[#3]** Re-verify click-to-highlight after backend OCR deploy lands — `next` `effort-day` (depends on backend [tenancy-api#1](https://github.com/kristenmartino/tenancy-api/issues/1))

## Later

Not issues yet — would be premature.

- Multi-tenant theming (organization branding, custom colors)
- Mobile-first layout pass (side-by-side breaks below ~900px today)
- Inline PDF source-span highlighting using bbox coordinates from a future Path-B/C implementation (currently relies on text-layer matching)
- Re-extraction diff view
- Bulk operations on the lease list (approve-all, filter by status)
- Better empty / loading / error states across the board

## Blocked on

- Backend OCR deploy ([tenancy-api#1](https://github.com/kristenmartino/tenancy-api/issues/1)) for #3 above

## Recent decisions

- **Server components everywhere except where state requires client** — `LeaseDetailLayout`, `UploadForm`, `PdfViewer*` are the only `"use client"` components. Keeps the bundle small and pushes data fetches to the edge.
- **React Context for the field-click → PDF-highlight signal** — beats prop-drilling through 4 layers of section/list/row components in `Extraction.tsx`.
- **Dynamic import of `PdfViewer` with `ssr: false`** — `pdfjs-dist` touches browser-only APIs at module load. Wrapped in `PdfViewerLoader` so server components can import it without breaking the build.
- **CDN-hosted PDF.js worker (unpkg)** — cdnjs lagged the bundled version. unpkg proxies npm directly so any released version is available.
- **Loose token-based highlight matching** — exact span matching failed constantly because pypdf and pdf.js chunk text differently. Loose matcher favors "show the user something" over perfect precision.
- **Graceful error boundary on every server-side fetch** — prevents Vercel's generic 500 page from appearing on transient backend hiccups; instead a useful inline error with the actual message.

## Velocity

High. Staying high for the moment — frontend work hasn't peaked since the side-by-side detail layout shipped.

## Audience class

Portfolio / case study now. Productize-to-sell secondary path same as the API.

## Repos

- This repo: `kristenmartino/tenancy` (Next.js 16 frontend on Vercel)
- Backend + MCP: [`kristenmartino/tenancy-api`](https://github.com/kristenmartino/tenancy-api)

Shared project board: https://github.com/users/kristenmartino/projects/2 — spans both repos so cross-repo dependencies (like #3 → tenancy-api#1) are visible in one place.
