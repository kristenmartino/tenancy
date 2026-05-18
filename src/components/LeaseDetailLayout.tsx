"use client";

import { useState } from "react";
import { ExtractionView } from "@/components/Extraction";
import { PdfViewer } from "@/components/PdfViewerLoader";
import { SeverityBadge } from "@/components/StatusBadge";
import type { Exception, FieldHighlight, Lease } from "@/lib/api";

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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="lg:sticky lg:top-6 lg:self-start">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Source PDF
        </h2>
        <PdfViewer url={pdfUrl} highlight={highlight} />
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
                <li
                  key={exc.exception_id}
                  className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={exc.severity} />
                    <code className="text-xs text-gray-600 dark:text-gray-400">
                      {exc.field_path}
                    </code>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">
                    {exc.description}
                  </p>
                  {exc.suggested_action && (
                    <p className="mt-2 text-xs text-gray-500">
                      Suggested: {exc.suggested_action}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
