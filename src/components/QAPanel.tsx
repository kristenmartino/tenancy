"use client";

import { useState } from "react";
import { queryLease, type FieldHighlight, type QAResponse } from "@/lib/api";

const SUGGESTED_QUESTIONS = [
  "What is the rent?",
  "When does the lease expire?",
  "Any flagged exceptions?",
];

// 5xx → backend / LLM failure (e.g. Haiku truncating its JSON output
// mid-string). 4xx → bad request. Anything else → unclassified.
function friendlyError(raw: string): { headline: string; detail: string } {
  if (/^5\d\d /.test(raw)) {
    return {
      headline: "The model had trouble answering that — try again.",
      detail: raw,
    };
  }
  if (/^4\d\d /.test(raw)) {
    return { headline: "Couldn’t ask that question.", detail: raw };
  }
  return { headline: "Something went wrong.", detail: raw };
}

export function QAPanel({
  leaseId,
  onCitationClick,
}: {
  leaseId: string;
  onCitationClick: (h: FieldHighlight) => void;
}) {
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<QAResponse | null>(null);

  const submit = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLastQuestion(trimmed);
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await queryLease(leaseId, trimmed);
      setResponse(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(question);
  };

  const handleSuggested = (q: string) => {
    setQuestion(q);
    submit(q);
  };

  const handleCitationClick = (citation: QAResponse["citations"][number]) => {
    if (citation.page_number == null) return;
    // Q&A citations come from the Q&A response shape which doesn't carry
    // bbox coords — only page + snippet. Page-jump only, no overlay.
    onCitationClick({
      page: citation.page_number,
      fieldPath: citation.field_path,
      bboxes: [],
    });
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this lease…"
          disabled={loading}
          className="flex-1 rounded border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:placeholder:text-gray-500"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSuggested(q)}
            disabled={loading}
            className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {q}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-sm italic text-gray-500" role="status">
          Thinking…
        </p>
      )}

      {error && !loading && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{friendlyError(error).headline}</p>
            {lastQuestion && (
              <button
                type="button"
                onClick={() => submit(lastQuestion)}
                className="flex-shrink-0 rounded border border-red-300 px-2 py-0.5 text-xs font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/30"
              >
                Try again
              </button>
            )}
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs opacity-70 hover:opacity-100">
              Technical detail
            </summary>
            <p className="mt-1 break-words font-mono text-xs opacity-80">
              {friendlyError(error).detail}
            </p>
          </details>
        </div>
      )}

      {response && !loading && (
        <div className="rounded border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
            {response.answer}
          </p>
          {response.citations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {response.citations.map((c, i) => {
                const clickable = c.page_number != null;
                return (
                  <button
                    key={`${c.field_path}-${i}`}
                    type="button"
                    onClick={() => handleCitationClick(c)}
                    disabled={!clickable}
                    title={
                      clickable
                        ? "Click to view source in PDF"
                        : "No page reference for this citation"
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                      clickable
                        ? "cursor-pointer border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                        : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
                    }`}
                  >
                    <code className="font-mono">{c.field_path}</code>
                    {c.page_number != null && (
                      <span className="opacity-75">p.{c.page_number}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
