"use client";

import { useState } from "react";
import { ExtractionView } from "@/components/Extraction";
import { ExceptionRow } from "@/components/ExceptionRow";
import { PdfViewer } from "@/components/PdfViewerLoader";
import { QAPanel } from "@/components/QAPanel";
import { getLease, listExceptions, type Exception, type FieldHighlight, type Lease } from "@/lib/api";
import { fieldHighlight, getField, reviewState, loadReviewSnapshot } from "@/lib/presentation";

export function LeaseDetailLayout({ lease: initialLease, exceptions: initialExceptions, pdfUrl }: {
  lease: Lease; exceptions: Exception[]; pdfUrl: string;
}) {
  const [snapshot, setSnapshot] = useState({ lease: initialLease, exceptions: initialExceptions });
  const [highlight, setHighlight] = useState<FieldHighlight | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [savedDecision, setSavedDecision] = useState<Exception | null>(null);
  const { lease, exceptions } = snapshot;
  const review = reviewState(exceptions, lease.status);
  const priority = { blocking: 0, warning: 1, informational: 2 };
  const active = [...review.open, ...review.rejected].sort((a, b) => priority[a.severity] - priority[b.severity]);
  const history = exceptions.filter((item) => item.resolved && !review.rejected.includes(item));
  const pdfUrlWithCacheBust = `${pdfUrl}?v=${encodeURIComponent(lease.updated_at)}`;

  async function refreshSnapshot(updated?: Exception) {
    setRefreshing(true);
    setRefreshError(false);
    if (updated) setSavedDecision(updated);
    try {
      const freshSnapshot = await loadReviewSnapshot(() => getLease(lease.lease_id), () => listExceptions(lease.lease_id));
      setSnapshot(freshSnapshot);
      setSavedDecision(null);
    } catch {
      setRefreshError(true);
    } finally { setRefreshing(false); }
  }

  function viewSource(source: FieldHighlight) {
    setHighlight(source);
    document.getElementById("source-pdf")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const renderException = (exception: Exception) => {
    const field = getField(lease.extraction, exception.field_path);
    const value = field?.value;
    const initialEditValue = value == null ? "" : Array.isArray(value) ? value.join(", ") : typeof value === "object" ? "" : String(value);
    return <ExceptionRow key={`${exception.exception_id}-${exception.resolved}-${exception.resolution}`} exception={exception} field={field} initialEditValue={initialEditValue} source={fieldHighlight(field, exception.field_path)} onSourceClick={viewSource} onResolved={refreshSnapshot} disabled={refreshing || savedDecision !== null} />;
  };

  return (
    <div className="tenancy-detail-grid grid min-w-0 gap-x-8 gap-y-8 lg:grid-cols-2">
      <section aria-labelledby="review-heading" className="min-w-0 lg:col-start-2 lg:row-start-1">
        <div className="mb-5 border-b border-gray-200 pb-4 dark:border-gray-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Review queue</p>
          <h2 id="review-heading" className="text-xl font-semibold tracking-tight" aria-live="polite">{review.headline}</h2>
          {lease.status === "complete" && <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{review.open.length} open · {review.blocking.length} open blocker{review.blocking.length === 1 ? "" : "s"}{review.rejected.length > 0 && ` · ${review.rejected.length} rejected blocker${review.rejected.length === 1 ? "" : "s"}`}</p>}
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{review.waiting ? "Fields and review checks will appear when extraction finishes." : review.failed ? "Upload the PDF again to retry extraction." : lease.status !== "complete" ? "The extraction status could not be confirmed." : "Compare flagged values with the PDF before accepting or correcting them. Automated checks do not verify every field."}</p>
        </div>
        {refreshing && <p role="status" className="mb-3 text-sm text-gray-600 dark:text-gray-400">Decision saved. Reloading fields and review items…</p>}
        {refreshError && <div role="alert" className="mb-4 border-l-2 border-amber-500 pl-3 text-sm"><p>Your decision was saved, but the latest fields could not be loaded. Values and counts below still show the previous snapshot. Reload before making another decision.</p><button type="button" onClick={() => refreshSnapshot()} className="mt-1 text-blue-700 underline dark:text-blue-300">Reload fields</button></div>}
        {active.length > 0 ? <ul>{active.map(renderException)}</ul> : lease.status === "complete" && <p className="text-sm text-gray-700 dark:text-gray-300">No flagged values are awaiting a decision. You can still check the extracted fields below.</p>}
        {history.length > 0 && <details className="tenancy-review-history mt-5 border-t border-gray-200 pt-4 dark:border-gray-800"><summary className="cursor-pointer text-sm font-medium">Review history ({history.length})</summary><ul className="mt-4">{history.map(renderException)}</ul></details>}
      </section>

      <section id="source-pdf" className="tenancy-no-print min-w-0 scroll-mt-6 lg:sticky lg:top-6 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:self-start">
        <h2 className="mb-3 text-base font-semibold">Source PDF</h2>
        <PdfViewer key={lease.updated_at} url={pdfUrlWithCacheBust} highlight={highlight} />
      </section>

      <section className="min-w-0 lg:col-start-2 lg:row-start-2">
        <h2 className="mb-2 text-xl font-semibold tracking-tight">Extracted fields</h2>
        {savedDecision && <p role="status" className="mb-3 text-sm font-medium text-amber-900 dark:text-amber-200">These fields are from before your last saved decision. Awaiting reload.</p>}
        <p className="mb-5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">Use the page links to check each value. Model certainty is self-reported; it is not measured accuracy or human verification.</p>
        {lease.extraction ? <ExtractionView extraction={lease.extraction} onFieldClick={viewSource} correctedPaths={exceptions.filter((item) => item.resolved && item.resolution === "edit").map((item) => item.field_path)} />
          : <p className="text-sm text-gray-600 dark:text-gray-400">{review.waiting ? "Extraction is in progress. Results will appear here automatically." : review.failed ? "No extracted fields are available. Upload the PDF again to retry." : "No extracted fields are available for this lease."}</p>}
        {lease.extraction && <details className="tenancy-no-print mt-8 border-t border-gray-200 pt-5 dark:border-gray-800"><summary className="cursor-pointer text-base font-semibold">Ask about this lease</summary><p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Answers use the extracted fields. Check the cited pages for context.</p><div className="mt-4"><QAPanel leaseId={lease.lease_id} onCitationClick={viewSource} /></div></details>}
      </section>
    </div>
  );
}
