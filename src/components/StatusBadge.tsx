const LABELS: Record<string, string> = {
  complete: "Extraction complete", pending: "Extracting", ingested: "PDF received",
  extracted: "Checking fields", validated: "Checks complete", ingest_failed: "PDF could not be read",
  extract_failed: "Extraction failed", pipeline_failed: "Extraction failed",
};

export function StatusBadge({ status }: { status: string }) {
  const color = status.endsWith("_failed")
    ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";
  return <span className={`inline-block rounded border px-2 py-1 text-xs font-medium ${color}`}>{LABELS[status] ?? "Status unavailable"}</span>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const color = severity === "blocking"
    ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
    : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  return <span className={`rounded px-2 py-1 text-xs font-medium ${color}`}>{severity === "blocking" ? "Blocking" : severity === "warning" ? "Check value" : "For review"}</span>;
}
