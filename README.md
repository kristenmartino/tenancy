# Tenancy (web)

Next.js 16 + Tailwind 4 UI for the [tenancy-api](https://github.com/kristenmartino/tenancy-api) lease abstraction agent. Drop a residential lease PDF URL, get a structured extraction with source citations and a queue of human-review exceptions.

Live API: https://tenancy-api-production.up.railway.app

## What's here

| Route | What it does |
|---|---|
| `/` | Lease list + upload form (POST a PDF URL → kicks off extraction → redirects to detail) |
| `/leases/[id]` | Structured extraction (JSON, with source spans) and the validation exception queue |

The PDF viewer + source-span click-to-highlight + interactive exception resolve UI are scaffolded gaps — see the [v1 roadmap](#v1-roadmap).

## Stack

- Next.js 16 (App Router), React 19, TypeScript 5
- Tailwind 4
- Server components fetch the API; one client component for the upload form

## Configuration

`NEXT_PUBLIC_TENANCY_API_BASE` overrides the API base URL (defaults to the live Railway deploy).

```bash
npm install
npm run dev          # localhost:3000
NEXT_PUBLIC_TENANCY_API_BASE=http://localhost:8000 npm run dev  # point at local backend
```

## Deploying

Vercel auto-detects Next.js — push the repo, import it in Vercel, no env vars required for the default API target.

## v1 roadmap

- PDF viewer (react-pdf) with click-to-highlight from extracted source spans
- Inline exception resolve (approve / edit / reject) instead of read-only
- Q&A panel hitting `/leases/{id}/query` with citations
- Auth — currently the API is open

---

Companion to [kristenmartino/tenancy-api](https://github.com/kristenmartino/tenancy-api). Part of an applied AI portfolio: [kristenmartino.ai](https://kristenmartino.ai).
