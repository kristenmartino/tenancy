import type { Exception, ExtractedField, Extraction, FieldHighlight, Lease } from "./api";

const LABELS: Record<string, string> = {
  base_monthly_rent: "Monthly rent", due_day_of_month: "Rent due (day of month)",
  notice_to_vacate_days: "Notice required (days)", nsf_fee: "Returned payment fee",
  late_fee_flat: "Late fee", late_fee_daily: "Daily late fee", grace_period_days: "Grace period (days)",
  pet_fee_nonrefundable: "Nonrefundable pet fee", weight_limit_lbs: "Pet weight limit (lb)",
  guest_stay_limit_days: "Guest stay limit (days)", square_feet: "Area (sq ft)",
  rollover: "After the initial term", parties: "Lease parties", zip_code: "ZIP code",
};

export function fieldLabel(key: string): string {
  return LABELS[key] ?? key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}

export function fieldPathLabel(path: string): string {
  const party = path.match(/^parties\[(\d+)\]\.(.+)$/);
  if (party) return `Party ${Number(party[1]) + 1} · ${fieldLabel(party[2])}`;
  const parts = path.split(".");
  return parts.length > 1 ? `${fieldLabel(parts[0])} · ${fieldLabel(parts.at(-1)!)}` : fieldLabel(path);
}

export function documentName(value: string): string {
  const raw = value.startsWith("upload://") ? value.slice(9) : (() => {
    try { const url = new URL(value); return url.pathname.split("/").filter(Boolean).at(-1) || url.hostname; }
    catch { return value || "Lease document"; }
  })();
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export function getField(extraction: Extraction | null, path: string): ExtractedField | null {
  let current: unknown = extraction;
  for (const part of path.split(/\.|\[|\]/).filter(Boolean)) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current && typeof current === "object" && "value" in current
    ? current as ExtractedField : null;
}

export function fieldHighlight(field: ExtractedField | null, path: string): FieldHighlight | null {
  if (!field?.source) return null;
  return { page: field.source.page_number, fieldPath: path,
    bboxes: field.source.bboxes?.length ? field.source.bboxes : field.source.bbox ? [field.source.bbox] : [] };
}

export function missingValueLabel(field: ExtractedField): string {
  if (field.source?.match_type === "blank") return "Blank in document";
  if (field.source?.match_type === "absent") return "Not stated";
  return "Not extracted";
}

export function fieldNoteSummary(field: ExtractedField): string | null {
  if (field.value == null) return null; // The value label already explains the gap.
  if (field.notes && /placeholder|sample name/i.test(field.notes)) return "Possible placeholder value";
  if (field.source?.match_type === "inferred") return "Inferred from the lease; check the source.";
  if (field.source?.match_type === "checkbox") return "Read from a checkbox; check the source.";
  return null;
}

export function reviewState(exceptions: Exception[], status: string) {
  const open = exceptions.filter((e) => !e.resolved);
  const rejected = exceptions.filter((e) => e.resolved && e.resolution === "reject" && e.severity === "blocking");
  const blocking = open.filter((e) => e.severity === "blocking");
  const waiting = ["pending", "ingested", "extracted", "validated"].includes(status);
  const failed = status.endsWith("_failed");
  const headline = waiting ? "Review available after extraction"
    : failed ? "Extraction needs another attempt"
    : status !== "complete" ? "Review status unavailable"
    : rejected.length ? `${rejected.length} rejected ${rejected.length === 1 ? "value still blocks" : "values still block"} review`
    : open.length ? `${open.length} ${open.length === 1 ? "item needs" : "items need"} review`
    : "No open review items";
  return { open, rejected, blocking, headline, waiting, failed };
}

export function exceptionMessage(exception: Exception): string {
  if (exception.exception_type === "missing_required_field" && /required but value is null/.test(exception.description))
    return "Required value is missing. Check the source and enter the value.";
  if (exception.exception_type === "low_confidence")
    return "The model is uncertain about this value. Check the source before accepting it.";
  return exception.description;
}

export function formatFieldValue(value: unknown, format?: "currency" | "default"): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const numeric = typeof value === "number" ? value : typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : null;
  if (format === "currency" && numeric !== null && Number.isFinite(numeric))
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(numeric);
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return /^[a-z_]+$/.test(value) && value.includes("_") ? fieldLabel(value) : value;
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return JSON.stringify(value);
}

export function pageAfterSourceChange(currentPage: number, previousSource: FieldHighlight | null | undefined, source: FieldHighlight | null | undefined): number {
  return source !== previousSource && source?.page ? source.page : currentPage;
}

const CURRENCY_FIELDS = new Set(["base_monthly_rent", "late_fee_flat", "late_fee_daily", "nsf_fee", "prorated_first_month", "security_deposit", "pet_deposit", "pet_fee_nonrefundable", "last_month_rent", "key_deposit", "monthly_pet_rent", "early_termination_fee"]);

export function fieldFormat(path: string): "currency" | "default" {
  return CURRENCY_FIELDS.has(path.split(".").at(-1) ?? path) ? "currency" : "default";
}

export async function loadReviewSnapshot(readLease: () => Promise<Lease>, readExceptions: () => Promise<Exception[]>) {
  // A saved decision is separate from the displayed snapshot. Publish fields
  // and decisions together only after both canonical reads succeed.
  const [lease, exceptions] = await Promise.all([readLease(), readExceptions()]);
  return { lease, exceptions };
}
