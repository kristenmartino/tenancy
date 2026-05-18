import Link from "next/link";
import { notFound } from "next/navigation";
import { SeverityBadge, StatusBadge } from "@/components/StatusBadge";
import { getLease, listExceptions } from "@/lib/api";

export default async function LeasePage({
  params,
}: {
  params: Promise<{ lease_id: string }>;
}) {
  const { lease_id } = await params;
  let lease, exceptions;
  try {
    [lease, exceptions] = await Promise.all([
      getLease(lease_id),
      listExceptions(lease_id),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("404")) notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← back
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-lg">{lease_id.slice(0, 8)}</h1>
          <StatusBadge status={lease.status} />
        </div>
        <a
          href={lease.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-xs text-gray-500 hover:underline"
        >
          {lease.pdf_url}
        </a>
        {lease.error && (
          <pre className="rounded bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {lease.error}
          </pre>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Extraction
          </h2>
          {lease.extraction ? (
            <pre className="max-h-[700px] overflow-auto rounded border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed dark:border-gray-800 dark:bg-gray-950">
              {JSON.stringify(lease.extraction, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-gray-500">No extraction yet.</p>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Exceptions{" "}
            <span className="text-gray-400">({exceptions.length})</span>
          </h2>
          {exceptions.length === 0 ? (
            <p className="text-sm text-gray-500">No exceptions.</p>
          ) : (
            <ul className="space-y-3">
              {exceptions.map((exc) => (
                <li
                  key={exc.exception_id}
                  className="rounded border border-gray-200 p-3 text-sm dark:border-gray-800"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={exc.severity} />
                    <code className="text-xs text-gray-600 dark:text-gray-400">
                      {exc.field_path}
                    </code>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">
                    {exc.description}
                  </p>
                  {exc.suggested_action && (
                    <p className="mt-2 text-xs text-gray-500">
                      Suggested: {exc.suggested_action}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
