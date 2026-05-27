import Link from "next/link";
import { notFound } from "next/navigation";
import { LeaseDetailLayout } from "@/components/LeaseDetailLayout";
import { LeaseStatusPoller } from "@/components/LeaseStatusPoller";
import { StatusBadge } from "@/components/StatusBadge";
import { getLease, listExceptions } from "@/lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_TENANCY_API_BASE ||
  "https://tenancy-api-production.up.railway.app";

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

  const pdfUrl = `${API_BASE}/leases/${lease_id}/pdf`;
  const showSource = !lease.pdf_url.startsWith("upload://");

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="tenancy-no-print text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← back
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-lg">{lease_id.slice(0, 8)}</h1>
          <StatusBadge status={lease.status} />
        </div>
        {showSource ? (
          <a
            href={lease.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all text-xs text-gray-500 hover:underline"
          >
            {lease.pdf_url}
          </a>
        ) : (
          <p className="text-xs text-gray-500">{lease.pdf_url}</p>
        )}
        {lease.error && (
          <pre className="rounded bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {lease.error}
          </pre>
        )}
        {lease.status === "pending" && (
          <div className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
            </span>
            Extraction in progress — this page refreshes automatically when it
            completes (~30-60s).
          </div>
        )}
      </header>

      <LeaseStatusPoller leaseId={lease_id} currentStatus={lease.status} />

      <LeaseDetailLayout
        lease={lease}
        exceptions={exceptions}
        pdfUrl={pdfUrl}
      />
    </div>
  );
}
