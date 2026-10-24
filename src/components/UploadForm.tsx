"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLease, uploadLease } from "@/lib/api";

type Mode = "url" | "file";

export function UploadForm() {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { lease_id } =
        mode === "url"
          ? await createLease(url)
          : await uploadLease(file as File);
      router.push(`/leases/${lease_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  }

  const canSubmit =
    !loading && (mode === "url" ? url.length > 0 : file !== null);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="mb-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        <TabButton active={mode === "url"} onClick={() => { setMode("url"); setError(null); }}>
          PDF link
        </TabButton>
        <TabButton active={mode === "file"} onClick={() => { setMode("file"); setError(null); }}>
          Upload PDF
        </TabButton>
      </div>

      {mode === "url" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            aria-label="PDF link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            required
            className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
          />
          <SubmitButton disabled={!canSubmit} loading={loading} />
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="min-w-0 flex-1 cursor-pointer">
            <input
              type="file"
              aria-label="Lease PDF"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:border-gray-700 dark:bg-gray-950 dark:file:bg-gray-800 dark:file:text-gray-300"
            />
            {file && (
              <p className="mt-1 text-xs text-gray-500">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </label>
          <SubmitButton disabled={!canSubmit} loading={loading} />
        </div>
      )}

      {error && <div role="alert" className="mt-3 text-sm text-red-800 dark:text-red-200"><p>Could not start extraction. Check the PDF and try again.</p><details className="mt-1 text-xs"><summary className="cursor-pointer">Technical details</summary><p className="mt-2 break-words">{error}</p></details></div>}
      <p className="mt-3 text-xs text-gray-500">
        Extraction runs in the background. Results appear on the next screen when ready.
      </p>
    </form>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        active
          ? "border-blue-600 text-blue-600 dark:text-blue-400"
          : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function SubmitButton({
  disabled,
  loading,
}: {
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? "Starting…" : "Extract lease"}
    </button>
  );
}
