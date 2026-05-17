const COLORS: Record<string, string> = {
  complete: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  ingested: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  extracted: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  validated: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ingest_failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  extract_failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const color =
    severity === "blocking"
      ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
      : severity === "warning"
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {severity}
    </span>
  );
}
