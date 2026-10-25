"use client";

import { createContext, useContext } from "react";
import type {
  ExtractedField,
  Extraction,
  FieldHighlight,
  Party,
} from "@/lib/api";
import { fieldLabel, fieldHighlight, fieldNoteSummary, displayedFieldValue } from "@/lib/presentation";

// Pass the click handler through React Context instead of prop-drilling
// through 4 layers of section / list / row components.
const ClickContext = createContext<((h: FieldHighlight) => void) | null>(null);
const CorrectedContext = createContext<string[]>([]);

// ---------------------------------------------------------------------------
// Top-level
// ---------------------------------------------------------------------------

export function ExtractionView({
  extraction,
  onFieldClick,
  correctedPaths = [],
}: {
  extraction: Extraction;
  onFieldClick?: (h: FieldHighlight) => void;
  correctedPaths?: string[];
}) {
  return (
    <ClickContext.Provider value={onFieldClick ?? null}>
    <CorrectedContext.Provider value={correctedPaths}>
    <div className="space-y-7">
      <SectionCard title="Parties">
        {extraction.parties.length === 0 ? (
          <p className="text-sm text-gray-500">No parties extracted.</p>
        ) : (
          <div className="space-y-4">
            {extraction.parties.map((p, i) => (
              <PartyBlock key={i} party={p} index={i} />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Property">
        <FieldList
          sectionPath="property"
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
          sectionPath="term"
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
          sectionPath="rent"
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
          sectionPath="deposits"
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
          sectionPath="utilities"
          fields={extraction.utilities}
          order={["electric", "gas", "water", "sewer", "trash", "internet", "cable"]}
        />
      </SectionCard>

      <SectionCard title="Pets">
        <FieldList
          sectionPath="pets"
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
          sectionPath="special_clauses"
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
          sectionPath="compliance"
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
    </CorrectedContext.Provider>
    </ClickContext.Provider>
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
    <section className="border-t border-gray-200 pt-4 dark:border-gray-800">
      <header className="mb-2">
        <h3 className="text-base font-semibold">
          {title}
        </h3>
      </header>
      <div>{children}</div>
    </section>
  );
}

function PartyBlock({ party, index }: { party: Party; index: number }) {
  return (
    <div className="border-l-2 border-gray-200 pl-4 dark:border-gray-700">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {party.role}
        </span>
      </div>
      <dl>
        <FieldRow
          label="Name"
          field={party.name}
          fieldPath={`parties[${index}].name`}
        />
        {party.email && (
          <FieldRow
            label="Email"
            field={party.email}
            fieldPath={`parties[${index}].email`}
          />
        )}
        {party.phone && (
          <FieldRow
            label="Phone"
            field={party.phone}
            fieldPath={`parties[${index}].phone`}
          />
        )}
        {party.address && (
          <FieldRow
            label="Address"
            field={party.address}
            fieldPath={`parties[${index}].address`}
          />
        )}
      </dl>
    </div>
  );
}

type FormatHint = "currency" | "default";

function FieldList({
  sectionPath,
  fields,
  order,
  formats,
}: {
  sectionPath: string;
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
            label={fieldLabel(key)}
            field={f}
            fieldPath={`${sectionPath}.${key}`}
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
  fieldPath,
  format,
}: {
  label: string;
  field: ExtractedField;
  fieldPath: string;
  format?: FormatHint;
}) {
  const onClick = useContext(ClickContext);
  const corrected = useContext(CorrectedContext).includes(fieldPath);
  const source = fieldHighlight(field, fieldPath);
  const missing = field.value === null || field.value === undefined;
  const noteSummary = corrected ? null : fieldNoteSummary(field);

  return (
    <div id={`field-${fieldPath}`} className="grid gap-1 border-b border-gray-100 py-3 last:border-0 dark:border-gray-800 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-x-4">
      <dt className="text-sm text-gray-600 dark:text-gray-400">{label}</dt>
      <dd className="min-w-0 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={`min-w-0 break-words ${missing ? "text-gray-600 dark:text-gray-400" : "font-medium"}`}>
            {displayedFieldValue(field, format, corrected)}
          </span>
          {source && onClick && <button type="button" onClick={() => onClick(source)} aria-label={`View source for ${label}, page ${source.page}`} className="tenancy-no-print shrink-0 text-xs font-medium text-blue-700 hover:underline dark:text-blue-300">p.{source.page}</button>}
          {source && <span className="tenancy-print-only text-xs">p.{source.page}</span>}
          {corrected && <span className="text-xs text-gray-600 dark:text-gray-400">Corrected by reviewer</span>}
        </div>
        {noteSummary && <p className="mt-1 text-xs text-amber-900 dark:text-amber-200">{noteSummary}</p>}
        {!corrected && typeof field.value === "boolean" && field.source?.match_type === "inferred" && field.source.snippet && <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Source excerpt: “{field.source.snippet}”</p>}
        <details className="tenancy-field-details mt-2 text-xs text-gray-600 dark:text-gray-400">
          <summary className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-200">{field.notes ? corrected ? "Original model note" : "Note and certainty" : corrected ? "Correction details" : "Model certainty"}</summary>
          <div className="mt-2 space-y-2 leading-relaxed">
            {field.notes && <p>{corrected && <span className="font-medium">Before correction: </span>}{field.notes}</p>}
            {corrected ? <p>The value was corrected by a reviewer. The stored certainty score is not an independent accuracy check.</p> : <p>Model certainty: {(field.confidence * 100).toFixed(0)}%. Self-reported; not measured accuracy or human verification.{missing && " This score does not supply the missing value."}</p>}
          </div>
        </details>
      </dd>
    </div>
  );
}
