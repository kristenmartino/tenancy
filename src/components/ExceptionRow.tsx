"use client";

import { useState } from "react";
import { SeverityBadge } from "@/components/StatusBadge";
import { resolveException, type Exception, type ExtractedField, type FieldHighlight, type ResolveAction } from "@/lib/api";
import { exceptionMessage, fieldPathLabel, formatFieldValue, fieldFormat, displayedFieldValue } from "@/lib/presentation";

export function ExceptionRow({ exception, field, initialEditValue, source, onSourceClick, onResolved, disabled = false }: {
  exception: Exception;
  field: ExtractedField | null;
  initialEditValue: string;
  source: FieldHighlight | null;
  onSourceClick: (source: FieldHighlight) => void;
  onResolved: (updated: Exception) => Promise<void>;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialEditValue);
  const [pending, setPending] = useState<ResolveAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = pending !== null || disabled;
  const rejectedBlocker = exception.resolved && exception.resolution === "reject" && exception.severity === "blocking";
  const correction = exception.correction?.value;
  const resolutionLabel = exception.resolution === "edit" ? "Value corrected" : exception.resolution === "approve" ? "Value accepted" : "Value rejected";

  async function submit(action: ResolveAction, value?: string) {
    setPending(action);
    setError(null);
    try {
      const updated = await resolveException(exception.exception_id, action, value !== undefined ? { value } : undefined);
      setEditing(false);
      await onResolved(updated);
    } catch {
      setError("Could not save this decision. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <li className="border-b border-gray-200 py-4 first:pt-0 last:border-0 last:pb-0 dark:border-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{fieldPathLabel(exception.field_path)}</h3>
        {(!exception.resolved || rejectedBlocker) && <SeverityBadge severity={exception.severity} />}
      </div>
      <p className="mt-2 break-words text-sm"><span className="text-gray-600 dark:text-gray-400">Extracted value: </span><span className="font-medium">{field ? displayedFieldValue(field, fieldFormat(exception.field_path), exception.resolved && exception.resolution === "edit") : "No extracted value available"}</span></p>
      <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{exceptionMessage(exception)}</p>
      {exception.resolved && <p className="mt-2 text-sm font-medium">{resolutionLabel}{exception.resolution === "edit" && correction !== undefined && <>: <span className="break-words">{formatFieldValue(correction, fieldFormat(exception.field_path))}</span></>}</p>}
      {rejectedBlocker && <p className="mt-2 text-sm text-red-800 dark:text-red-200">This rejected value remains a blocker.</p>}
      <div className="tenancy-no-print mt-3 flex flex-wrap items-center gap-3">
        {source ? <button type="button" onClick={() => onSourceClick(source)} className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-300">View source · p.{source.page}</button>
          : <span className="text-xs text-gray-600 dark:text-gray-400">No source reference available</span>}
        <details className="text-xs text-gray-600 dark:text-gray-400">
          <summary className="cursor-pointer">Check details</summary>
          <div className="mt-2 space-y-2 break-words">
            <p>{exception.description}</p>
            {exception.suggested_action && <p>{exception.suggested_action}</p>}
            <p className="font-mono">{exception.field_path}</p>
          </div>
        </details>
      </div>
      {editing && !exception.resolved && (
        <form className="tenancy-no-print mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); submit("edit", editValue); }}>
          <label className="block text-sm font-medium" htmlFor={`correction-${exception.exception_id}`}>Corrected value</label>
          <div className="flex flex-wrap gap-2">
            <input id={`correction-${exception.exception_id}`} value={editValue} onChange={(event) => setEditValue(event.target.value)} autoFocus disabled={busy} className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" />
            <button type="submit" disabled={busy || !editValue.trim()} className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">{pending === "edit" ? "Saving…" : "Save value"}</button>
            <button type="button" disabled={busy} onClick={() => { setEditing(false); setEditValue(initialEditValue); }} className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">Cancel</button>
          </div>
        </form>
      )}
      {!editing && !exception.resolved && (
        <div className="tenancy-no-print mt-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => submit("approve")} className="rounded border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-900">{pending === "approve" ? "Saving…" : "Accept value"}</button>
            <button type="button" disabled={busy} onClick={() => { setEditing(true); setError(null); }} className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">Edit value</button>
            <button type="button" disabled={busy} onClick={() => submit("reject")} className="rounded border border-red-200 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950">{pending === "reject" ? "Saving…" : "Reject value"}</button>
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">Accept keeps the current value. {exception.severity === "blocking" ? "Reject keeps this item blocking." : "Reject records your decision without correcting the value."}</p>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-800 dark:text-red-200">{error}</p>}
    </li>
  );
}
