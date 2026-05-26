import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { UploadForm } from "@/components/UploadForm";
import { type Lease, listLeases } from "@/lib/api";

export default async function HomePage() {
  let leases: Lease[] = [];
  let fetchError: string | null = null;
  try {
    leases = await listLeases();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Tenancy</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Lease abstraction agent. Drop a PDF URL; get structured fields with
          source citations and a queue of flagged exceptions for human review.
        </p>
      </header>

      <UploadForm />

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Leases <span className="text-gray-400">({leases.length})</span>
        </h2>
        {fetchError ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900/40 dark:bg-red-900/20">
            <p className="font-medium text-red-700 dark:text-red-300">
              Couldn&apos;t reach the API
            </p>
            <pre className="mt-2 overflow-auto text-xs text-red-600 dark:text-red-400">
              {fetchError}
            </pre>
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Refresh to retry, or check Railway is healthy.
            </p>
          </div>
        ) : leases.length === 0 ? (
          <p className="text-sm text-gray-500">
            None yet. Drop a URL above to get started.
          </p>
        ) : (
          <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-800">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[88px] sm:w-[110px]" />
                <col />
                <col className="w-[44px] sm:w-[120px]" />
                <col className="hidden sm:table-column sm:w-[180px]" />
              </colgroup>
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-medium sm:px-4">Status</th>
                  <th className="px-3 py-2 font-medium sm:px-4">Source</th>
                  <th className="px-3 py-2 text-right font-medium sm:px-4 sm:text-left">
                    <span className="sm:hidden">Exc.</span>
                    <span className="hidden sm:inline">Exceptions</span>
                  </th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell sm:px-4">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {leases.map((lease) => (
                  <tr
                    key={lease.lease_id}
                    className="border-t border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                  >
                    <td className="px-3 py-3 sm:px-4">
                      <StatusBadge status={lease.status} />
                    </td>
                    <td className="truncate px-3 py-3 sm:px-4">
                      <Link
                        href={`/leases/${lease.lease_id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                        title={lease.pdf_url}
                      >
                        {hostnameOf(lease.pdf_url)}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums sm:px-4 sm:text-left">
                      {lease.exception_count}
                    </td>
                    <td className="hidden truncate px-3 py-3 text-gray-500 sm:table-cell sm:px-4">
                      {new Date(lease.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}
