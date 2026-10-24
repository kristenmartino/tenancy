import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { UploadForm } from "@/components/UploadForm";
import { type Lease, listLeases } from "@/lib/api";
import { documentName } from "@/lib/presentation";

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
          Extract lease details and check them against the original PDF.
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
              Could not load your leases
            </p>
            <details className="mt-2"><summary className="cursor-pointer text-xs">Technical details</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs">{fetchError}</pre></details>
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Refresh the page to try again.
            </p>
          </div>
        ) : leases.length === 0 ? (
          <p className="text-sm text-gray-500">
            No leases yet. Upload a PDF or paste a PDF link to get started.
          </p>
        ) : (
          <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-800">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[112px] sm:w-[160px]" />
                <col />
                <col className="w-[62px] sm:w-[110px]" />
                <col className="hidden sm:table-column sm:w-[180px]" />
              </colgroup>
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-medium sm:px-4">Extraction</th>
                  <th className="px-3 py-2 font-medium sm:px-4">Document</th>
                  <th className="px-3 py-2 text-right font-medium sm:px-4 sm:text-left">
                    <span className="sm:hidden">Review</span>
                    <span className="hidden sm:inline">Needs review</span>
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
                        {documentName(lease.pdf_url)}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums sm:px-4 sm:text-left">
                      {lease.status === "complete" ? lease.exception_count : "—"}
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
