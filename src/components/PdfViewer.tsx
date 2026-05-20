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

// PDF.js needs cmap files to decode CIDFonts used by ocrmypdf and many
// other PDF generators. Without cMapUrl, canvas rendering still works
// (so you see the page), but text extraction produces nothing — which
// is why our OCR'd PDFs were producing empty text layers.
const PDF_OPTIONS = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep a ref so the post-render callback always sees the latest highlight
  // (avoids stale-closure issues if highlight changes mid-render).
  const highlightRef = useRef(highlight);
  useEffect(() => {
    highlightRef.current = highlight;
  }, [highlight]);

  // When a highlight arrives, jump to that page (if different).
  useEffect(() => {
    if (highlight?.page && highlight.page !== pageNumber) {
      setPageNumber(highlight.page);
    }
  }, [highlight, pageNumber]);

  // If the click is on a field that lives on the page we're already showing,
  // the Page doesn't re-render, so onTextLayerReady never fires. Apply the
  // highlight directly. A small delay covers React's commit phase.
  useEffect(() => {
    if (!highlight?.snippet || !containerRef.current) return;
    if (highlight.page !== pageNumber) return; // page-change case handles itself
    const t = setTimeout(() => {
      if (!containerRef.current) return;
      clearHighlights(containerRef.current);
      applyHighlight(containerRef.current, highlight);
    }, 50);
    return () => clearTimeout(t);
  }, [highlight, pageNumber]);

  // Fires after react-pdf finishes rendering the text layer for the
  // current page. Pulls the latest highlight from the ref.
  function onTextLayerReady() {
    if (!containerRef.current) return;
    clearHighlights(containerRef.current);
    const h = highlightRef.current;
    if (h?.snippet) {
      applyHighlight(containerRef.current, h);
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
            options={PDF_OPTIONS}
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

function applyHighlight(root: HTMLElement, h: FieldHighlight) {
  // react-pdf historically used .react-pdf__Page__textContent; pdfjs-dist
  // adds .textLayer. Try both, then fall back to the whole container.
  const layer =
    root.querySelector(".textLayer") ||
    root.querySelector(".react-pdf__Page__textContent") ||
    root;

  const allSpans = Array.from(layer.querySelectorAll<HTMLElement>("span"));
  if (allSpans.length === 0) return;

  // Build the page text by concatenating spans in document order, tracking
  // which character range belongs to which span.
  let pageText = "";
  const ranges: Array<{ span: HTMLElement; start: number; end: number }> = [];
  for (const span of allSpans) {
    const text = span.textContent ?? "";
    if (!text) continue;
    ranges.push({ span, start: pageText.length, end: pageText.length + text.length });
    pageText += `${text} `;
  }
  const lower = pageText.toLowerCase();

  // Strategy: try matching the field's VALUE first ("1621 James Ave",
  // "(254) 235-8343", "$25.00"). The value is verbatim from the
  // extraction, so when it appears in the page it's almost certainly the
  // right spot. Fall back to the LLM's snippet only if value is null or
  // short — snippets often paraphrase or include surrounding context that
  // matches the wrong region (e.g., a section heading several lines above
  // the actual value).
  let matchRange = h.value && h.value.length >= 4
    ? findLongestSubstring(lower, h.value.toLowerCase(), 4)
    : null;
  if (!matchRange && h.snippet) {
    matchRange = findLongestSubstring(lower, h.snippet.toLowerCase(), 12);
  }

  // eslint-disable-next-line no-console
  console.log("[tenancy] highlight", {
    fieldPath: h.fieldPath,
    value: h.value?.slice(0, 30),
    matched: matchRange ? "value" : h.snippet ? "snippet/none" : "none",
    matchLen: matchRange ? matchRange[1] - matchRange[0] : 0,
  });

  if (!matchRange) return;
  const [matchStart, matchEnd] = matchRange;

  const matched: HTMLElement[] = [];
  for (const { span, start, end } of ranges) {
    if (end > matchStart && start < matchEnd) {
      span.classList.add("tenancy-highlight");
      matched.push(span);
    }
  }
  matched[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * Find the longest contiguous substring of `needle` that appears in
 * `haystack`. Returns [start, end) in haystack coordinates, or null if
 * no match meets the floor length.
 */
function findLongestSubstring(
  haystack: string,
  needle: string,
  floor: number,
): [number, number] | null {
  if (needle.length < floor) return null;
  for (let len = needle.length; len >= floor; len--) {
    for (let s = 0; s + len <= needle.length; s++) {
      const idx = haystack.indexOf(needle.slice(s, s + len));
      if (idx >= 0) return [idx, idx + len];
    }
  }
  return null;
}
