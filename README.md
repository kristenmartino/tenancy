# Tenancy (web)

Next.js 16 + Tailwind 4 UI for the [tenancy-api](https://github.com/kristenmartino/tenancy-api) lease abstraction agent. Drop a residential lease PDF URL, get a structured extraction with source citations, a click-to-highlight PDF viewer, an interactive exception review queue, and grounded Q&A — all with per-field provenance back to the original document.

Live: [tenancy-opal.vercel.app](https://tenancy-opal.vercel.app) · API: https://tenancy-api-production.up.railway.app

## Demos

- **Main demo (60–90s):** SaaS UI tour — upload, extraction, click-to-highlight, exception resolve, Q&A. Script at [`docs/demo-script.md`](docs/demo-script.md). Video: `docs/demo.mp4` (forthcoming).
- **Bonus (~30s):** Same agent via [MCP server in Claude Desktop](https://github.com/kristenmartino/tenancy-api#mcp-surface). Script and clip live in the backend repo.

## What's here

| Route | What it does |
|---|---|
| `/` | Lease list + upload form. Drop a PDF URL or upload a file → kicks off extraction → redirects to detail. |
| `/leases/[id]` | Side-by-side PDF viewer + structured extraction + exception queue + grounded Q&A. Click any extracted field → PDF jumps to source page with a coordinate-anchored bbox overlay. |

All four panels (PDF viewer, extraction, exception resolve, Q&A) are live. Bbox overlays driven by extraction-time `bboxes: BoundingBox[]` from the backend (OCR-anchored via pdfplumber — see [tenancy-api#26](https://github.com/kristenmartino/tenancy-api/pull/26)). Multi-line values render Word-style, blank-template fields anchor on the labeled blank line, not the section header.

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5
- Tailwind 4
- `react-pdf` for the PDF viewer (canvas-only, no text layer — overlays are absolutely-positioned divs driven by bbox coordinates)
- Server components by default; `"use client"` only where state requires it (`LeaseDetailLayout`, `PdfViewer*`, `UploadForm`, `Extraction`, `QAPanel`, `ExceptionRow`)

## Configuration

`NEXT_PUBLIC_TENANCY_API_BASE` overrides the API base URL (defaults to the live Railway deploy).

```bash
npm install
npm run dev          # localhost:3000
NEXT_PUBLIC_TENANCY_API_BASE=http://localhost:8000 npm run dev  # point at local backend
```

## Deploying

Vercel auto-detects Next.js — push the repo, import it in Vercel, no env vars required for the default API target.

## Status

V0 feature-complete: ingest → extract → validate → review queue → Q&A → click-to-highlight, all live. Remaining V0 work is the demo recording itself. Productize gates (multi-tenant auth, eval set, queue infra, observability) explicitly deferred per the case-study framing — see [`STATUS.md`](STATUS.md) for the full roadmap and recent decisions.

---

Companion to [kristenmartino/tenancy-api](https://github.com/kristenmartino/tenancy-api). Part of an applied AI portfolio: [kristenmartino.ai](https://kristenmartino.ai).
