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
// Highlight matching — see normalizeWithMap + applyHighlight below.
// ---------------------------------------------------------------------------


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
  // which character range in pageText belongs to which span.
  let pageText = "";
  const ranges: Array<{ span: HTMLElement; start: number; end: number }> = [];
  for (const span of allSpans) {
    const text = span.textContent ?? "";
    if (!text) continue;
    ranges.push({ span, start: pageText.length, end: pageText.length + text.length });
    pageText += `${text} `;
  }

  // Build a normalized version (lowercase + alphanumerics-and-single-spaces)
  // with a map back to original pageText positions. Match in normalized
  // space — that way "(254) 235-8343", "(254)235-8343", and "(254)\n235-8343"
  // all collapse to the same string. Then map the match back to original
  // coordinates so we can highlight the right spans.
  const { norm, origIdx } = normalizeWithMap(pageText);

  // Try the field's value first (verbatim from extraction), fall back to
  // the LLM's snippet.
  const matchRange =
    findValueMatch(norm, origIdx, h.value, h.snippet) ??
    findSnippetMatch(norm, origIdx, h.snippet);

  if (!matchRange) {
    // eslint-disable-next-line no-console
    console.log("[tenancy] highlight: NO MATCH", {
      fieldPath: h.fieldPath,
      value: h.value?.slice(0, 30),
    });
    return;
  }
  const [matchStart, matchEnd] = matchRange;

  const matched: HTMLElement[] = [];
  for (const { span, start, end } of ranges) {
    if (end > matchStart && start < matchEnd) {
      span.classList.add("tenancy-highlight");
      matched.push(span);
    }
  }

  // Diagnostic — includes the matched chunk's actual text and the first
  // matched span's bounding rect, so if the matcher is picking the right
  // text but the highlight appears in the wrong visual place, we'll see
  // the discrepancy in console.
  const matchedText = pageText.slice(matchStart, matchEnd).slice(0, 60);
  const firstRect = matched[0]?.getBoundingClientRect();
  // eslint-disable-next-line no-console
  console.log("[tenancy] highlight", {
    fieldPath: h.fieldPath,
    value: h.value?.slice(0, 30),
    matchedText,
    matchLen: matchEnd - matchStart,
    spans: matched.length,
    firstSpanRect: firstRect && {
      top: Math.round(firstRect.top),
      left: Math.round(firstRect.left),
      width: Math.round(firstRect.width),
      height: Math.round(firstRect.height),
    },
  });

  matched[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * Normalize text: lowercase, alphanumerics only, runs of any other chars
 * collapse to a single space. Returns the normalized string AND a parallel
 * array mapping each char index in `norm` back to its source index in `s`.
 */
function normalizeWithMap(s: string): { norm: string; origIdx: number[] } {
  const norm: string[] = [];
  const origIdx: number[] = [];
  let lastWasSpace = true;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const isAlnum =
      (c >= 48 && c <= 57) ||
      (c >= 65 && c <= 90) ||
      (c >= 97 && c <= 122);
    if (isAlnum) {
      norm.push(s[i].toLowerCase());
      origIdx.push(i);
      lastWasSpace = false;
    } else if (!lastWasSpace) {
      norm.push(" ");
      origIdx.push(i);
      lastWasSpace = true;
    }
  }
  // Drop trailing space if present
  if (norm.length > 0 && norm[norm.length - 1] === " ") {
    norm.pop();
    origIdx.pop();
  }
  return { norm: norm.join(""), origIdx };
}

function findValueMatch(
  norm: string,
  origIdx: number[],
  value: string | null,
  snippet: string,
): [number, number] | null {
  if (!value) return null;
  const { norm: needle } = normalizeWithMap(value);
  if (needle.length < 3) return null; // too generic

  // Collect all occurrences in normalized space
  const occurrences: number[] = [];
  let scan = 0;
  while (true) {
    const i = norm.indexOf(needle, scan);
    if (i < 0) break;
    occurrences.push(i);
    scan = i + 1;
  }

  if (occurrences.length === 0) {
    // Value doesn't appear cleanly; try longest substring against the value
    return findLongestSubstringNorm(norm, origIdx, needle, 4);
  }

  // Single match → done. Multi-match → disambiguate by snippet context.
  const chosen =
    occurrences.length === 1
      ? occurrences[0]
      : pickByContext(norm, occurrences, needle.length, snippet);
  return [origIdx[chosen], origIdx[chosen + needle.length - 1] + 1];
}

function findSnippetMatch(
  norm: string,
  origIdx: number[],
  snippet: string,
): [number, number] | null {
  if (!snippet) return null;
  const { norm: needle } = normalizeWithMap(snippet);
  return findLongestSubstringNorm(norm, origIdx, needle, 12);
}

function findLongestSubstringNorm(
  norm: string,
  origIdx: number[],
  needle: string,
  floor: number,
): [number, number] | null {
  if (needle.length < floor) return null;
  for (let len = needle.length; len >= floor; len--) {
    for (let s = 0; s + len <= needle.length; s++) {
      const idx = norm.indexOf(needle.slice(s, s + len));
      if (idx >= 0) return [origIdx[idx], origIdx[idx + len - 1] + 1];
    }
  }
  return null;
}

function pickByContext(
  norm: string,
  occurrences: number[],
  matchLen: number,
  snippet: string,
): number {
  if (!snippet) return occurrences[0];
  const { norm: snippetNorm } = normalizeWithMap(snippet);
  const tokens = snippetNorm.split(" ").filter((t) => t.length >= 4);
  if (tokens.length === 0) return occurrences[0];

  const RADIUS = 250;
  let best = occurrences[0];
  let bestScore = -1;
  for (const o of occurrences) {
    const window = norm.slice(
      Math.max(0, o - RADIUS),
      Math.min(norm.length, o + matchLen + RADIUS),
    );
    const score = tokens.reduce(
      (acc, t) => acc + (window.includes(t) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}
