"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import type { BoundingBox, FieldHighlight } from "@/lib/api";

// Worker from unpkg matching the bundled pdfjs-dist version exactly.
// unpkg proxies npm directly, so any published version is available
// (cdnjs lags by a few releases — was missing 5.4.296).
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Canvas-only rendering: no cmap / standard-font URLs needed (those only
// matter when react-pdf builds a text layer, which we dropped along with
// the text-matching highlighter).
const PDF_OPTIONS = {};

// Max rendered page width. Below this, the page scales down to fit the
// container (mobile). Above this, the page caps at MAX so single-page reads
// stay comfortable on wide desktops.
const PAGE_MAX_WIDTH_PX = 520;
const PAGE_CONTAINER_PADDING_X = 24; // matches p-3 (12px each side)

type OverlayRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

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
  const [overlays, setOverlays] = useState<OverlayRect[]>([]);
  const [pageWidth, setPageWidth] = useState<number>(PAGE_MAX_WIDTH_PX);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstOverlayRef = useRef<HTMLDivElement>(null);
  const renderedSizeRef = useRef<{ width: number; height: number } | null>(null);

  // Track the container's clientWidth so the PDF page scales to fit the
  // available space. Caps at PAGE_MAX_WIDTH_PX so it doesn't blow up on
  // wide desktops; on phones / tablets it shrinks to fit.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const measure = () => {
      const available = node.clientWidth - PAGE_CONTAINER_PADDING_X;
      const next = Math.max(280, Math.min(PAGE_MAX_WIDTH_PX, available));
      setPageWidth(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // When a highlight arrives, jump to that page (if different).
  useEffect(() => {
    if (highlight?.page && highlight.page !== pageNumber) {
      setPageNumber(highlight.page);
    }
  }, [highlight, pageNumber]);

  const computeOverlays = useCallback(() => {
    const size = renderedSizeRef.current;
    const container = containerRef.current;
    const canvas = container?.querySelector<HTMLCanvasElement>(
      ".react-pdf__Page__canvas",
    );
    if (
      !highlight ||
      highlight.page !== pageNumber ||
      highlight.bboxes.length === 0 ||
      !size ||
      !canvas ||
      !container
    ) {
      setOverlays([]);
      return;
    }
    const cRect = container.getBoundingClientRect();
    const kRect = canvas.getBoundingClientRect();
    const offsetLeft = kRect.left - cRect.left + container.scrollLeft;
    const offsetTop = kRect.top - cRect.top + container.scrollTop;
    setOverlays(
      highlight.bboxes.map((bbox: BoundingBox) => ({
        left: offsetLeft + bbox.x * size.width,
        top: offsetTop + bbox.y * size.height,
        width: bbox.width * size.width,
        height: bbox.height * size.height,
      })),
    );
  }, [highlight, pageNumber]);

  useEffect(() => {
    computeOverlays();
  }, [computeOverlays]);

  useEffect(() => {
    if (overlays.length > 0 && firstOverlayRef.current) {
      firstOverlayRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [overlays]);

  // react-pdf hands us a PageCallback with width/height at the rendered
  // scale. Stash them so we can derive pixel coords for the bbox overlays
  // (canvas may briefly mount before its width/height are settled).
  const onPageRenderSuccess = (page: { width: number; height: number }) => {
    renderedSizeRef.current = { width: page.width, height: page.height };
    computeOverlays();
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

      <div
        ref={containerRef}
        className="tenancy-pdf-viewer relative overflow-auto p-3"
      >
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            Failed to load PDF: {error}
          </div>
        ) : (
          <Document
            file={url}
            options={PDF_OPTIONS}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(err) => setError(err.message)}
            loading={<p className="text-sm text-gray-500">Loading PDF…</p>}
            error={<p className="text-sm text-red-600">Failed to load PDF.</p>}
          >
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onRenderSuccess={onPageRenderSuccess}
              className="mx-auto shadow-sm"
            />
          </Document>
        )}

        {overlays.map((rect, i) => (
          <div
            key={i}
            ref={i === 0 ? firstOverlayRef : undefined}
            className="tenancy-bbox-overlay pointer-events-none absolute"
            style={rect}
          />
        ))}
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
