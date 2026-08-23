import Section from "./Section";
import StatusBadge from "./StatusBadge";
import type { DigioExtractedValue, DigioVerification } from "@/lib/types";

const ACRONYMS = new Set([
  "id",
  "dl",
  "dob",
  "pan",
  "gst",
  "gstin",
  "ifsc",
  "upi",
  "micr",
  "kyc",
  "ocr",
  "url",
  "uid",
  "vid",
]);

function prettifyKey(key: string): string {
  const words = key.split(/[_\s.]+/).filter(Boolean);
  if (words.length === 0) return key;
  return words
    .map((word) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

function isRecord(
  value: DigioExtractedValue
): value is { [key: string]: DigioExtractedValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLeaf(value: DigioExtractedValue): boolean {
  if (Array.isArray(value)) return value.every((item) => !isRecord(item) && !Array.isArray(item));
  if (isRecord(value)) return Object.keys(value).length === 0;
  return true;
}

function formatLeaf(value: DigioExtractedValue): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(formatLeaf).filter((part) => part !== "—");
    return parts.length > 0 ? parts.join(", ") : "—";
  }
  if (isRecord(value)) return "—";
  return value.trim() === "" ? "—" : value;
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(parsed)} IST`;
}

export function DigioBadge() {
  return (
    <span className="inline-flex items-center rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
      Digio
    </span>
  );
}

function ExtractedEntries({ data }: { data: Record<string, DigioExtractedValue> }) {
  const entries = Object.entries(data);
  const leaves = entries.filter(([, value]) => isLeaf(value));
  const nested = entries.filter(([, value]) => !isLeaf(value));

  return (
    <div className="space-y-3">
      {leaves.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          {leaves.map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-gray-400">{prettifyKey(key)}</dt>
              <dd className="break-words text-gray-800">{formatLeaf(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {nested.map(([key, value]) => (
        <div key={key}>
          <p className="mb-1.5 text-xs font-semibold text-gray-500">{prettifyKey(key)}</p>
          <div className="border-l-2 border-gray-100 pl-3">
            <ExtractedEntries data={toRecord(value)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function toRecord(value: DigioExtractedValue): Record<string, DigioExtractedValue> {
  if (isRecord(value)) return value;
  if (Array.isArray(value)) {
    return Object.fromEntries(value.map((item, index) => [`#${index + 1}`, item]));
  }
  return {};
}

function VerificationCard({ verification }: { verification: DigioVerification }) {
  const { extracted_data: extracted } = verification;
  const data =
    extracted && typeof extracted === "object" && !Array.isArray(extracted) ? extracted : null;
  const hasData = data !== null && Object.keys(data).length > 0;
  const createdAt = formatTimestamp(verification.created_at);

  return (
    <div className="rounded-md border border-gray-100 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-gray-800">
            {verification.label || prettifyKey(verification.verification_type)}
          </p>
          <DigioBadge />
          <StatusBadge status={verification.result} />
        </div>
        {createdAt && <span className="text-xs text-gray-500">{createdAt}</span>}
      </div>

      {hasData ? (
        <ExtractedEntries data={data} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-400">ID Number</dt>
              <dd className="break-words text-gray-800">{verification.id_number || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Holder Name</dt>
              <dd className="break-words text-gray-800">{verification.holder_name || "—"}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-gray-400">
            Digio returned no extracted field data for this record.
          </p>
        </>
      )}

      {verification.digio_request_id && (
        <p className="mt-2 font-mono text-[10px] text-gray-400">
          Digio request {verification.digio_request_id}
        </p>
      )}
    </div>
  );
}

export default function DigioVerificationPanel({
  verifications,
}: {
  verifications?: DigioVerification[] | null;
}) {
  const items = verifications ?? [];

  return (
    <Section
      title={items.length > 0 ? `Digio Verification (${items.length})` : "Digio Verification"}
    >
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">
          No Digio verifications on record — every KYC value below was entered by the user.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-gray-500">
            Values below were machine-extracted by Digio from the uploaded documents, not
            typed in by the user.
          </p>
          <div className="space-y-4">
            {items.map((verification) => (
              <VerificationCard key={verification.id} verification={verification} />
            ))}
          </div>
        </>
      )}
    </Section>
  );
}
