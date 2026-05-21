const BASE =
  process.env.NEXT_PUBLIC_TENANCY_API_BASE ||
  "https://tenancy-api-production.up.railway.app";

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SourceMatchType =
  | "filled"      // value is typed/printed in a writable space
  | "blank"       // labeled placeholder with no value filled in
  | "inferred"    // value implied by surrounding prose
  | "checkbox"    // value decided from a checked/unchecked box
  | "absent";     // document doesn't address this field at all

export type SourceSpan = {
  page_number: number;
  char_start: number;
  char_end: number;
  snippet: string;
  match_type: SourceMatchType;
  section_label: string | null;
  // Per-line highlight rects (PDF QuadPoints model). Derived server-side
  // from the OCR'd PDF's word positions; empty array = no overlay.
  bboxes: BoundingBox[];
  // DEPRECATED single-rect form, kept for one schema cycle so older DB
  // rows still deserialize. New extractions populate `bboxes` instead.
  bbox?: BoundingBox | null;
};

export type ExtractedField<T = unknown> = {
  value: T | null;
  confidence: number;
  source: SourceSpan | null;
  notes: string | null;
};

export type FieldHighlight = {
  page: number;
  fieldPath: string;
  // Per-line highlight rects from the OCR-anchored backend derivation.
  // Empty = no overlay, just navigate to the page.
  bboxes: BoundingBox[];
};

export type Party = {
  name: ExtractedField<string>;
  role: string;
  email: ExtractedField<string> | null;
  phone: ExtractedField<string> | null;
  address: ExtractedField<string> | null;
};

export type Extraction = {
  lease_id: string;
  template_detected: string;
  parties: Party[];
  property: Record<string, ExtractedField | null>;
  term: Record<string, ExtractedField | null>;
  rent: Record<string, ExtractedField | null>;
  deposits: Record<string, ExtractedField | null>;
  utilities: Record<string, ExtractedField | null>;
  pets: Record<string, ExtractedField | null>;
  special_clauses: Record<string, ExtractedField | null>;
  compliance: Record<string, ExtractedField | null>;
  overall_confidence: number;
};

export type Lease = {
  lease_id: string;
  pdf_url: string;
  status: string;
  extraction: Extraction | null;
  error: string | null;
  exception_count: number;
  created_at: string;
  updated_at: string;
};

export type Exception = {
  exception_id: string;
  lease_id: string;
  field_path: string;
  exception_type: string;
  severity: "blocking" | "warning" | "informational";
  description: string;
  suggested_action: string | null;
  resolved: boolean;
  resolution: string | null;
  correction: Record<string, unknown> | null;
  created_at: string;
};

export type QAResponse = {
  answer: string;
  citations: Array<{
    field_path: string;
    page_number: number | null;
    snippet: string | null;
  }>;
};

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  }
  return res.json();
}

export const listLeases = () => fetchJSON<Lease[]>("/leases");

export const getLease = (id: string) => fetchJSON<Lease>(`/leases/${id}`);

export const createLease = (pdfUrl: string) =>
  fetchJSON<{ lease_id: string; status: string }>("/leases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdf_url: pdfUrl }),
  });

export const uploadLease = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  // Note: don't set Content-Type — the browser sets it with the multipart
  // boundary automatically. Manually setting it breaks the boundary.
  return fetchJSON<{ lease_id: string; status: string }>("/leases/upload", {
    method: "POST",
    body: formData,
  });
};

export const listExceptions = (leaseId?: string) =>
  fetchJSON<Exception[]>(
    `/exceptions${leaseId ? `?lease_id=${leaseId}` : ""}`,
  );

export const queryLease = (id: string, question: string) =>
  fetchJSON<QAResponse>(`/leases/${id}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

export type ResolveAction = "approve" | "edit" | "reject";

export const resolveException = (
  id: string,
  action: ResolveAction,
  correction?: Record<string, unknown>,
) =>
  fetchJSON<Exception>(`/exceptions/${id}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      correction !== undefined ? { action, correction } : { action },
    ),
  });
