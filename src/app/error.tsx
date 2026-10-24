"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This page could not load. Try again in a moment.
      </p>
      <details><summary className="cursor-pointer text-sm">Technical details</summary><pre className="overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
        {error.message}
        {error.digest && `\n\ndigest: ${error.digest}`}
      </pre></details>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
