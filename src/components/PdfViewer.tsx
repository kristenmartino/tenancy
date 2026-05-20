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
      applyHighlight(containerRef.current, highlight.snippet);
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
      applyHighlight(containerRef.current, h.snippet);
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

// Pull "distinctive" tokens from the snippet: words ≥4 chars that aren't
// stopwords. These are much more reliable to match than prefix substrings,
// because PDF.js chunks text by runs (often per-word) and word order can
// shift relative to what pypdf extracted.
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "shall",
  "this",
  "that",
  "from",
  "into",
  "upon",
  "such",
  "your",
  "their",
  "have",
  "been",
  "will",
  "any",
  "all",
  "any",
  "lease",
  "tenant",
  "landlord",
  "agreement",
  "rent",
  "term",
]);

function distinctiveTokens(snippet: string): string[] {
  return normalize(snippet)
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
    .slice(0, 8);
}

function applyHighlight(root: HTMLElement, snippet: string) {
  // react-pdf historically used .react-pdf__Page__textContent; pdfjs-dist
  // adds .textLayer. Try both, then fall back to the whole container.
  const layer =
    root.querySelector(".textLayer") ||
    root.querySelector(".react-pdf__Page__textContent") ||
    root;

  const spans = layer.querySelectorAll<HTMLElement>("span");
  const needle = normalize(snippet);
  if (needle.length < 3) return;

  const tokens = distinctiveTokens(snippet);
  // Fallback prefix-based candidates in case tokens are too few.
  const prefixes = [
    needle.slice(0, 30),
    needle.slice(0, 18),
    needle.slice(0, 10),
    needle.slice(0, 6),
  ].filter((c) => c.length >= 4);

  const sampleTexts: string[] = [];
  const matches: HTMLElement[] = [];
  spans.forEach((span) => {
    const text = normalize(span.textContent || "");
    if (text.length < 2) return;
    if (sampleTexts.length < 5) sampleTexts.push(text.slice(0, 30));
    const cleanedText = text.replace(/[^a-z0-9 ]/g, " ");
    const hit =
      // Distinctive-token match (preferred)
      tokens.some(
        (t) =>
          cleanedText.includes(t) ||
          cleanedText.split(/\s+/).some((w) => w === t),
      ) ||
      // Prefix-substring fallback
      prefixes.some((c) => text.includes(c) || c.includes(text));
    if (hit) {
      span.classList.add("tenancy-highlight");
      matches.push(span);
    }
  });

  // Full diagnostic so we can see what's actually in the DOM if matching
  // continues to fail (different react-pdf 10 text-layer structure?).
  const allElements = root.querySelectorAll("*");
  const tagCounts: Record<string, number> = {};
  allElements.forEach((el) => {
    tagCounts[el.tagName.toLowerCase()] =
      (tagCounts[el.tagName.toLowerCase()] || 0) + 1;
  });
  // Deeper diagnostic: dump the text layer's own innerHTML so we can see
  // what PDF.js actually emitted into it (or whether it's empty).
  const layerInnerHTML =
    layer instanceof Element ? layer.innerHTML.slice(0, 400) : "(no layer)";
  // eslint-disable-next-line no-console
  console.log("[tenancy] highlight", {
    snippet: snippet.slice(0, 60),
    layerFound: layer !== root,
    layerClass: layer instanceof Element ? layer.className : "(none)",
    spans: spans.length,
    matches: matches.length,
    tokens,
    sampleSpanTexts: sampleTexts,
    rootChildElementCount: root.childElementCount,
    tagCounts,
    layerChildren: layer instanceof Element ? layer.children.length : 0,
    layerInnerHTML,
    classListSample: Array.from(allElements)
      .slice(0, 30)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className || "(no class)"}`),
  });

  matches[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
}
