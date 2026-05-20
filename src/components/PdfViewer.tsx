"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { FieldHighlight } from "@/lib/api";

// Worker from unpkg matching the bundled pdfjs-dist version exactly.
// unpkg proxies npm directly, so any published version is available
// (cdnjs lags by a few releases — was missing 5.4.296).
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PAGE_WIDTH = 520;

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
  // CSS pixel dimensions of the rendered canvas — null until measured
  // after the current page renders. Reset on every page change so we
  // never paint an overlay using stale (wrong-page) dims.
  const [canvasDims, setCanvasDims] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // Bumps on every highlight change so the overlay div remounts and the
  // CSS pulse animation replays (CSS animations don't restart on the
  // same element when the class is already applied).
  const [highlightSeq, setHighlightSeq] = useState(0);
  // Tracked so we can react to a new highlight prop during render
  // without a setState-in-effect (React 19's compiler-aware lint
  // forbids that, and the documented alternative is to compare prior
  // prop and dispatch state updates during the same render).
  const [lastHighlight, setLastHighlight] = useState<FieldHighlight | null>(
    highlight ?? null,
  );
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  if (highlight !== lastHighlight) {
    setLastHighlight(highlight ?? null);
    if (highlight) {
      setHighlightSeq((n) => n + 1);
      if (highlight.page && highlight.page !== pageNumber) {
        setPageNumber(highlight.page);
        setCanvasDims(null);
      }
      if (!highlight.bbox) {
        console.log(`[tenancy] highlight: no bbox for ${highlight.fieldPath}`);
      }
    }
  }

  // Once positioned, scroll the overlay into view.
  useEffect(() => {
    if (!overlayRef.current) return;
    overlayRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightSeq, canvasDims]);

  function onPageRenderSuccess() {
    const canvas = pageWrapperRef.current?.querySelector("canvas");
    if (canvas && canvas.clientWidth > 0) {
      setCanvasDims({
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      });
    }
  }

  const showOverlay =
    !!highlight?.bbox && highlight.page === pageNumber && !!canvasDims;

  const goToPage = (next: number) => {
    setPageNumber(next);
    setCanvasDims(null);
  };

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
              onClick={() => goToPage(Math.max(1, pageNumber - 1))}
            >
              ← Prev
            </PagerButton>
            <PagerButton
              disabled={pageNumber >= numPages}
              onClick={() => goToPage(Math.min(numPages, pageNumber + 1))}
            >
              Next →
            </PagerButton>
          </div>
        </div>
      )}

      <div className="tenancy-pdf-viewer overflow-auto p-3">
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
            <div
              ref={pageWrapperRef}
              className="relative mx-auto w-fit shadow-sm"
            >
              <Page
                pageNumber={pageNumber}
                width={PAGE_WIDTH}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderSuccess={onPageRenderSuccess}
              />
              {showOverlay && canvasDims && highlight?.bbox && (
                <div
                  key={highlightSeq}
                  ref={overlayRef}
                  className="tenancy-highlight pointer-events-none absolute"
                  style={{
                    top: highlight.bbox.y * canvasDims.height,
                    left: highlight.bbox.x * canvasDims.width,
                    width: highlight.bbox.width * canvasDims.width,
                    height: highlight.bbox.height * canvasDims.height,
                  }}
                />
              )}
            </div>
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
