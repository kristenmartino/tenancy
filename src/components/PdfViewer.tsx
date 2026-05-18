"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Load the PDF.js worker from a CDN matching the bundled pdfjs-dist version.
// Avoids the webpack/Turbopack worker-bundling dance (which has been flaky
// across Next.js + react-pdf versions). Trade-off: a CDN dependency at view
// time; if it's blocked or slow, the viewer fails to load.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      {numPages > 0 && (
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-800">
          <span className="text-xs text-gray-500">
            Page {pageNumber} of {numPages}
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

      <div className="overflow-auto p-3">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            Failed to load PDF: {error}
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(err) => setError(err.message)}
            loading={
              <p className="text-sm text-gray-500">Loading PDF…</p>
            }
            error={
              <p className="text-sm text-red-600">Failed to load PDF.</p>
            }
          >
            <Page
              pageNumber={pageNumber}
              width={520}
              renderAnnotationLayer={false}
              renderTextLayer={false}
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
