"use client";

import dynamic from "next/dynamic";

// react-pdf uses pdfjs-dist, which touches browser-only APIs at import
// time. Loading it via next/dynamic with ssr: false keeps Node out of it.
// next/dynamic with ssr: false is only allowed from client components,
// hence this thin "use client" wrapper.
export const PdfViewer = dynamic(
  () => import("./PdfViewer").then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
        Loading PDF viewer…
      </div>
    ),
  },
);
