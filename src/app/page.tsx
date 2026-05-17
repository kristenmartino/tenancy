import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { UploadForm } from "@/components/UploadForm";
import { listLeases } from "@/lib/api";

export default async function HomePage() {
  const leases = await listLeases();

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
        {leases.length === 0 ? (
          <p className="text-sm text-gray-500">
            None yet. Drop a URL above to get started.
          </p>
        ) : (
          <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Exceptions</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {leases.map((lease) => (
                  <tr
                    key={lease.lease_id}
                    className="border-t border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                  >
                    <td className="px-4 py-3">
                      <StatusBadge status={lease.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/leases/${lease.lease_id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {hostnameOf(lease.pdf_url)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{lease.exception_count}</td>
                    <td className="px-4 py-3 text-gray-500">
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
