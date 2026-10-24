import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lease not found</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This lease is unavailable. Return to the list to choose a lease.
      </p>
      <Link
        href="/"
        className="inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        ← Back to lease list
      </Link>
    </div>
  );
}
