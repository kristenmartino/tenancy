@AGENTS.md

# Claude (this repo)

Conventions for any Claude session working in `kristenmartino/tenancy` (frontend).

(`AGENTS.md` above carries the create-next-app default rules — note especially that Next.js 16 has breaking changes from older training data; check `node_modules/next/dist/docs/` for the actual API shape before writing code.)

## Pre-session ritual

Before starting any work in this repo, run:

```bash
cat STATUS.md                                       # active focus + open question + Next 3
gh pr list --repo kristenmartino/tenancy            # in-flight PRs
gh issue list --repo kristenmartino/tenancy         # current backlog
```

Cross-repo work? Also:

```bash
gh issue list --repo kristenmartino/tenancy-api     # backend backlog — often blocks frontend work
```

If `STATUS.md` hasn't been touched in ≥2 weeks, treat the "Active focus" line as stale — confirm current priority with the user before picking up work.

## End-of-PR ritual

Before opening (or asking to open) a PR, check:

1. **User-visible behavior change?** Take a screenshot or screen recording — drop into PR body. Future-you needs to see what changed visually.
2. **New component added?** Live close to where it's used. The `src/components/` directory is currently flat — split into folders only when there are > 10 files or a clear domain group.
3. **New API call?** Add the typed wrapper to `src/lib/api.ts`, don't `fetch()` from a component directly.
4. **Resolves a `Next 3` item in `STATUS.md`?** Check it off in the same PR, promote a `Later` item, commit the STATUS.md change together with the code.
5. **Introduces or closes an `Open question`?** Reflect it in `STATUS.md`.
6. **Cross-repo dependency?** Reference the other repo's issue (`tenancy-api#N`) in the PR body.

The repo only stays coherent if docs move with code.

## Repo shape

- `src/app/page.tsx` — server component, fetches lease list, renders home
- `src/app/leases/[lease_id]/page.tsx` — server component, fetches lease + exceptions, hands to client layout
- `src/app/error.tsx` — route-level error boundary (Next.js convention)
- `src/components/LeaseDetailLayout.tsx` — `"use client"`, holds shared state (e.g. PDF highlight target) for the detail page
- `src/components/Extraction.tsx` — `"use client"`, renders the structured field cards with click-to-highlight
- `src/components/PdfViewer.tsx` + `PdfViewerLoader.tsx` — `"use client"`, PDF.js wrapper with bbox-overlay renderer (multi-rect per-line, driven by `bboxes: BoundingBox[]` from the backend; loader dynamic-imports to avoid SSR)
- `src/components/UploadForm.tsx` — `"use client"`, two-tab form for URL paste or file upload
- `src/components/StatusBadge.tsx` — small status/severity pills
- `src/lib/api.ts` — typed fetch wrappers over the API (single source of truth for `NEXT_PUBLIC_TENANCY_API_BASE`)

Server components are the default. `"use client"` is opt-in for interactivity. Don't push state higher than it needs to be.
