"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLease } from "@/lib/api";

export function UploadForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { lease_id } = await createLease(url);
      router.push(`/leases/${lease_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <label className="mb-2 block text-sm font-medium">PDF URL</label>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          required
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Extract"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-500">
        Returns immediately with a lease_id. Extraction runs in the background
        (~25s). The detail page polls until status is &quot;complete&quot;.
      </p>
    </form>
  );
}
