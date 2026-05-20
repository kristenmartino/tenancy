# Status

> **Active focus:** ship the interactive review surfaces (exception resolve + Q&A panel) + record demo. Strict highlight matcher just landed ([#13](https://github.com/kristenmartino/tenancy/pull/13)) — silent failures are honest behavior; the actual fix is bbox overlays driven by extraction-time coordinates (issue [#14](https://github.com/kristenmartino/tenancy/issues/14), depends on backend bbox emission).

> **Open question:** none in flight. Highlight direction decided.

## Next 3

1. **[#1]** Interactive exception resolve UI (approve / edit / reject) — `now` `effort-day`
2. **[#2]** Q&A panel using existing `/leases/{id}/query` endpoint — `now` `effort-day`
3. **[#14]** Replace text-layer matching with bbox overlay — `next` `effort-week` (cross-repo dep on [tenancy-api#16](https://github.com/kristenmartino/tenancy-api/issues/16))

## Later

- **Mobile-first layout pass** — side-by-side breaks below ~900px today
- **Bulk operations** on the lease list (approve-all, filter by status)
- **Better empty / loading / error states** across the board
- **Multi-tenant theming** (organization branding, custom colors)
- **Re-extraction diff view**

## Blocked on

- [#14] (bbox overlay) is blocked on [tenancy-api#16](https://github.com/kristenmartino/tenancy-api/issues/16) — backend must emit `source.bbox` first

## Recent decisions

- **Strict highlight matcher v1** ([#13](https://github.com/kristenmartino/tenancy/pull/13)) — replaced 12+ iterations of fuzzy text matching with exact-normalized-match only. Silent failures preferred over wrong-place highlights. Real fix is bbox overlays (#14) once backend ships [tenancy-api#16](https://github.com/kristenmartino/tenancy-api/issues/16).
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
