"use client";

import { useState } from "react";
import { SeverityBadge } from "@/components/StatusBadge";
import type { Exception, ResolveAction } from "@/lib/api";
import { resolveException } from "@/lib/api";

export function ExceptionRow({
  exception,
  initialEditValue,
}: {
  exception: Exception;
  initialEditValue: string;
}) {
  const [resolved, setResolved] = useState(exception.resolved);
  const [resolution, setResolution] = useState<string | null>(
    exception.resolution,
  );
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialEditValue);
  const [pending, setPending] = useState<ResolveAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: ResolveAction, correction?: string) {
    // Optimistic: flip the row to resolved immediately, roll back on error.
    const prevResolved = resolved;
    const prevResolution = resolution;
    setResolved(true);
    setResolution(action);
    setPending(action);
    setError(null);
    try {
      await resolveException(
        exception.exception_id,
        action,
        correction !== undefined ? { value: correction } : undefined,
      );
      setEditing(false);
    } catch (err) {
      setResolved(prevResolved);
      setResolution(prevResolution);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
    }
  }

  const muted = resolved && !pending;

  return (
    <li
      className={`rounded border border-gray-200 p-3 text-sm dark:border-gray-800 ${
        muted ? "opacity-60" : ""
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={exception.severity} />
        <code className="text-xs text-gray-600 dark:text-gray-400">
          {exception.field_path}
        </code>
        {resolved && resolution && (
          <span className="ml-auto flex items-center gap-2">
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {resolution}
            </span>
            {!pending && (
              <button
                type="button"
                onClick={() => {
                  setResolved(false);
                  setResolution(null);
                  setError(null);
                }}
                // Local-only undo. Backend resolution persists; reloading the
                // page will show the row resolved again.
                title="Reopen in this view — backend resolution persists until backend reopen lands"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Reopen
              </button>
            )}
          </span>
        )}
      </div>
      <p
        className={`text-gray-700 dark:text-gray-300 ${
          muted && resolution === "reject" ? "line-through" : ""
        }`}
      >
        {exception.description}
      </p>
      {resolved && resolution === "edit" && editValue && !pending && (
        <p className="mt-1 text-sm">
          <span className="text-gray-500">→ corrected to </span>
          <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
            {editValue}
          </span>
        </p>
      )}
      {exception.suggested_action && (
        <p className="mt-2 text-xs text-gray-500">
          Suggested: {exception.suggested_action}
        </p>
      )}

      {editing && !resolved && (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit("edit", editValue);
          }}
        >
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            className="flex-1 min-w-[10rem] rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="submit"
            disabled={pending !== null}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending === "edit" ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setEditValue(initialEditValue);
            }}
            disabled={pending !== null}
            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </form>
      )}

      {!editing && !resolved && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => submit("approve")}
            disabled={pending !== null}
            className="rounded border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-100 disabled:opacity-50 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
          >
            {pending === "approve" ? "Approving…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditValue(initialEditValue);
              setEditing(true);
              setError(null);
            }}
            className="rounded border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => submit("reject")}
            disabled={pending !== null}
            className="rounded border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
          >
            {pending === "reject" ? "Rejecting…" : "Reject"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}
    </li>
  );
}
