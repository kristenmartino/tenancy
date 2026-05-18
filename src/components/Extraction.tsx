import type { ExtractedField, Extraction, Party } from "@/lib/api";

// ---------------------------------------------------------------------------
// Top-level
// ---------------------------------------------------------------------------

export function ExtractionView({ extraction }: { extraction: Extraction }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>
          template:{" "}
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {extraction.template_detected}
          </span>
        </span>
        <span>·</span>
        <span>
          overall confidence:{" "}
          <span className="font-mono text-gray-700 dark:text-gray-300">
            {(extraction.overall_confidence * 100).toFixed(0)}%
          </span>
        </span>
      </div>

      <SectionCard title="Parties">
        {extraction.parties.length === 0 ? (
          <p className="text-sm text-gray-500">No parties extracted.</p>
        ) : (
          <div className="space-y-4">
            {extraction.parties.map((p, i) => (
              <PartyBlock key={i} party={p} />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Property">
        <FieldList
          fields={extraction.property}
          order={[
            "street_address",
            "unit_number",
            "city",
            "state",
            "zip_code",
            "square_feet",
            "parking_spaces",
          ]}
        />
      </SectionCard>

      <SectionCard title="Term">
        <FieldList
          fields={extraction.term}
          order={[
            "start_date",
            "end_date",
            "lease_type",
            "rollover",
            "notice_to_vacate_days",
          ]}
        />
      </SectionCard>

      <SectionCard title="Rent">
        <FieldList
          fields={extraction.rent}
          order={[
            "base_monthly_rent",
            "due_day_of_month",
            "grace_period_days",
            "late_fee_flat",
            "late_fee_daily",
            "nsf_fee",
            "prorated_first_month",
            "payment_methods",
          ]}
          formats={{
            base_monthly_rent: "currency",
            late_fee_flat: "currency",
            late_fee_daily: "currency",
            nsf_fee: "currency",
            prorated_first_month: "currency",
          }}
        />
      </SectionCard>

      <SectionCard title="Deposits">
        <FieldList
          fields={extraction.deposits}
          order={[
            "security_deposit",
            "pet_deposit",
            "pet_fee_nonrefundable",
            "last_month_rent",
            "key_deposit",
          ]}
          formats={{
            security_deposit: "currency",
            pet_deposit: "currency",
            pet_fee_nonrefundable: "currency",
            last_month_rent: "currency",
            key_deposit: "currency",
          }}
        />
      </SectionCard>

      <SectionCard title="Utilities">
        <FieldList
          fields={extraction.utilities}
          order={["electric", "gas", "water", "sewer", "trash", "internet", "cable"]}
        />
      </SectionCard>

      <SectionCard title="Pets">
        <FieldList
          fields={extraction.pets}
          order={[
            "pets_allowed",
            "pet_count_limit",
            "weight_limit_lbs",
            "monthly_pet_rent",
            "breed_restrictions",
          ]}
          formats={{ monthly_pet_rent: "currency" }}
        />
      </SectionCard>

      <SectionCard title="Special clauses">
        <FieldList
          fields={extraction.special_clauses}
          order={[
            "early_termination_allowed",
            "early_termination_fee",
            "military_clause",
            "renewal_option",
            "sublet_allowed",
            "guest_stay_limit_days",
          ]}
          formats={{ early_termination_fee: "currency" }}
        />
      </SectionCard>

      <SectionCard title="Compliance disclosures">
        <FieldList
          fields={extraction.compliance}
          order={[
            "lead_paint_disclosure",
            "mold_disclosure",
            "bed_bug_disclosure",
            "asbestos_disclosure",
            "flood_zone_disclosure",
          ]}
        />
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <header className="border-b border-gray-100 px-4 py-2 dark:border-gray-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </h3>
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function PartyBlock({ party }: { party: Party }) {
  return (
    <div className="rounded border border-gray-100 p-3 dark:border-gray-800">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {party.role}
        </span>
      </div>
      <dl>
        <FieldRow label="Name" field={party.name} />
        {party.email && <FieldRow label="Email" field={party.email} />}
        {party.phone && <FieldRow label="Phone" field={party.phone} />}
        {party.address && <FieldRow label="Address" field={party.address} />}
      </dl>
    </div>
  );
}

type FormatHint = "currency" | "default";

function FieldList({
  fields,
  order,
  formats,
}: {
  fields: Record<string, ExtractedField | null>;
  order: string[];
  formats?: Record<string, FormatHint>;
}) {
  return (
    <dl>
      {order.map((key) => {
        const f = fields[key];
        if (!f) return null;
        return (
          <FieldRow
            key={key}
            label={humanize(key)}
            field={f}
            format={formats?.[key]}
          />
        );
      })}
    </dl>
  );
}

function FieldRow({
  label,
  field,
  format,
}: {
  label: string;
  field: ExtractedField;
  format?: FormatHint;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-50 py-2 last:border-0 dark:border-gray-800/50 md:flex-row md:items-baseline md:justify-between md:gap-3">
      <dt className="text-sm text-gray-500 md:flex-shrink-0">{label}</dt>
      <dd className="flex items-center gap-2 text-sm">
        <span className={field.value === null ? "text-gray-400" : "font-medium"}>
          {formatValue(field.value, format)}
        </span>
        <ConfidenceBadge value={field.confidence} />
      </dd>
      {field.notes && (
        <p className="basis-full text-xs italic text-gray-500 md:mt-1">
          {field.notes}
        </p>
      )}
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  if (value >= 0.99) return null;
  const color =
    value >= 0.85
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
      : value >= 0.7
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${color}`}>
      {(value * 100).toFixed(0)}%
    </span>
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function humanize(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatValue(value: unknown, format?: FormatHint): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (format === "currency") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    }
    return value.toLocaleString();
  }
  if (typeof value === "string") {
    // Humanize enum-ish strings (snake_case)
    if (/^[a-z_]+$/.test(value) && value.includes("_")) return humanize(value);
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.join(", ");
  }
  return JSON.stringify(value);
}
