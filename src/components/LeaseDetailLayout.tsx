"use client";

import { useState } from "react";
import { ExtractionView } from "@/components/Extraction";
import { ExceptionRow } from "@/components/ExceptionRow";
import { PdfViewer } from "@/components/PdfViewerLoader";
import type { Exception, Extraction, FieldHighlight, Lease } from "@/lib/api";

export function LeaseDetailLayout({
  lease,
  exceptions,
  pdfUrl,
}: {
  lease: Lease;
  exceptions: Exception[];
  pdfUrl: string;
}) {
  const [highlight, setHighlight] = useState<FieldHighlight | null>(null);

  // Cache-bust the PDF URL with the lease's updated_at so the browser
  // doesn't serve a cached 404 from when the lease was pending (and
  // pdf_bytes wasn't yet persisted). When status flips to complete and
  // updated_at changes, the URL changes → react-pdf re-fetches → fresh
  // bytes → text layer actually renders.
  const pdfUrlWithCacheBust = `${pdfUrl}?v=${encodeURIComponent(lease.updated_at)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="lg:sticky lg:top-6 lg:self-start">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Source PDF
        </h2>
        <PdfViewer
          key={lease.updated_at}
          url={pdfUrlWithCacheBust}
          highlight={highlight}
        />
      </section>

      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Extraction
          </h2>
          {lease.extraction ? (
            <ExtractionView
              extraction={lease.extraction}
              onFieldClick={setHighlight}
            />
          ) : (
            <p className="text-sm text-gray-500">No extraction yet.</p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Exceptions{" "}
            <span className="text-gray-400">({exceptions.length})</span>
          </h2>
          {exceptions.length === 0 ? (
            <p className="text-sm text-gray-500">No exceptions.</p>
          ) : (
            <ul className="space-y-3">
              {exceptions.map((exc) => (
                <ExceptionRow
                  key={exc.exception_id}
                  exception={exc}
                  initialEditValue={getValueAtPath(
                    lease.extraction,
                    exc.field_path,
                  )}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

// Resolve a field_path like "parties[0].name" or "property.street_address"
// down to the extracted value at that path. Returns "" when the path doesn't
// resolve — used to prefill the edit input.
function getValueAtPath(
  extraction: Extraction | null,
  path: string,
): string {
  if (!extraction) return "";
  const parts = path.split(/\.|\[|\]/).filter(Boolean);
  let cur: unknown = extraction;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[part];
  }
  const value =
    cur && typeof cur === "object" && "value" in cur
      ? (cur as { value: unknown }).value
      : cur;
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.join(", ");
  return "";
}
