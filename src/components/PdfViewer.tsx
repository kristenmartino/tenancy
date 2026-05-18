"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { FieldHighlight } from "@/lib/api";

// Worker from unpkg matching the bundled pdfjs-dist version exactly.
// unpkg proxies npm directly, so any published version is available
// (cdnjs lags by a few releases — was missing 5.4.296).
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfViewer({
  url,
  highlight,
}: {
  url: string;
  highlight?: FieldHighlight | null;
}) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // When a highlight arrives, jump to that page.
  useEffect(() => {
    if (highlight?.page && highlight.page !== pageNumber) {
      setPageNumber(highlight.page);
    }
    // intentionally not depending on pageNumber — clicking the same
    // field again should still re-trigger the highlight pass below.
  }, [highlight]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply highlight after the text layer renders. Runs every time the page
  // changes or the highlight changes.
  function onTextLayerReady() {
    if (!containerRef.current) return;
    clearHighlights(containerRef.current);
    if (highlight?.snippet) {
      applyHighlight(containerRef.current, highlight.snippet);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      {numPages > 0 && (
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-800">
          <span className="text-xs text-gray-500">
            Page {pageNumber} of {numPages}
            {highlight && (
              <span className="ml-2 font-mono text-blue-500">
                ← {highlight.fieldPath}
              </span>
            )}
          </span>
          <div className="flex gap-1">
            <PagerButton
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </PagerButton>
            <PagerButton
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            >
              Next →
            </PagerButton>
          </div>
        </div>
      )}

      <div ref={containerRef} className="tenancy-pdf-viewer overflow-auto p-3">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            Failed to load PDF: {error}
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(err) => setError(err.message)}
            loading={<p className="text-sm text-gray-500">Loading PDF…</p>}
            error={<p className="text-sm text-red-600">Failed to load PDF.</p>}
          >
            <Page
              pageNumber={pageNumber}
              width={520}
              renderTextLayer
              renderAnnotationLayer={false}
              onRenderTextLayerSuccess={onTextLayerReady}
              className="mx-auto shadow-sm"
            />
          </Document>
        )}
      </div>
    </div>
  );
}

function PagerButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Highlight matching
//
// PDF.js renders each text run as a positioned <span> inside .textLayer.
// A logical snippet from the extractor (which used pypdf's per-page text)
// usually spans many of these — different fonts, line breaks, and word
// boundaries each cause a split. We do a loose match: normalize the snippet,
// look for runs whose normalized text overlaps with it, and tint those.
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s ]+/g, " ").trim();
}

function clearHighlights(root: HTMLElement) {
  root
    .querySelectorAll(".tenancy-highlight")
    .forEach((el) => el.classList.remove("tenancy-highlight"));
}

function applyHighlight(root: HTMLElement, snippet: string) {
  const layer = root.querySelector(".react-pdf__Page__textContent, .textLayer");
  if (!layer) return;

  const needle = normalize(snippet);
  if (needle.length < 4) return;

  // Try a few prefix lengths so we tolerate snippets that include extra
  // context the rendered PDF chunks differently.
  const candidates = [
    needle.slice(0, 30),
    needle.slice(0, 18),
    needle.slice(0, 10),
  ];

  const matches: HTMLElement[] = [];
  layer.querySelectorAll<HTMLElement>("span").forEach((span) => {
    const text = normalize(span.textContent || "");
    if (!text) return;
    const hit = candidates.some(
      (c) => c.length >= 4 && (text.includes(c) || c.includes(text)),
    );
    if (hit) {
      span.classList.add("tenancy-highlight");
      matches.push(span);
    }
  });

  matches[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
}
