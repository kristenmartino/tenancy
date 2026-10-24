import Link from "next/link";
import { notFound } from "next/navigation";
import { LeaseDetailLayout } from "@/components/LeaseDetailLayout";
import { LeaseStatusPoller } from "@/components/LeaseStatusPoller";
import { StatusBadge } from "@/components/StatusBadge";
import { getLease, listExceptions } from "@/lib/api";
import { documentName } from "@/lib/presentation";

const API_BASE = process.env.NEXT_PUBLIC_TENANCY_API_BASE || "https://tenancy-api-production.up.railway.app";

export default async function LeasePage({ params }: { params: Promise<{ lease_id: string }> }) {
  const { lease_id } = await params;
  let lease, exceptions;
  try {
    [lease, exceptions] = await Promise.all([getLease(lease_id), listExceptions(lease_id)]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("404")) notFound();
    throw err;
  }
  const pdfUrl = `${API_BASE}/leases/${lease_id}/pdf`;
  const waiting = ["pending", "ingested", "extracted", "validated"].includes(lease.status);
  const snapshotKey = `${lease.updated_at}-${lease.status}-${exceptions.map((item) => `${item.exception_id}:${item.resolved}:${item.resolution}`).join(",")}`;

  return (
    <div className="space-y-8">
      <Link href="/" className="tenancy-no-print text-sm font-medium text-blue-700 hover:underline dark:text-blue-300">← All leases</Link>
      <header className="space-y-3 border-b border-gray-200 pb-6 dark:border-gray-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Tenancy / Lease review</p>
        <h1 className="break-words text-2xl font-semibold tracking-tight">{documentName(lease.pdf_url)}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={lease.status} />
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="tenancy-no-print text-sm font-medium text-blue-700 hover:underline dark:text-blue-300">Open original PDF ↗</a>
        </div>
        {lease.error && <div role="alert" className="border-l-2 border-red-500 pl-3 text-sm text-red-800 dark:text-red-200"><p>Extraction could not finish. Upload the PDF again to retry.</p><details className="mt-2"><summary className="cursor-pointer text-xs">Technical details</summary><pre className="mt-2 whitespace-pre-wrap break-words text-xs">{lease.error}</pre></details></div>}
        {waiting && <p role="status" className="text-sm text-gray-700 dark:text-gray-300">Reading the lease. This page updates automatically when results are ready.</p>}
      </header>
      <LeaseStatusPoller leaseId={lease_id} currentStatus={lease.status} />
      <LeaseDetailLayout key={snapshotKey} lease={lease} exceptions={exceptions} pdfUrl={pdfUrl} />
    </div>
  );
}
