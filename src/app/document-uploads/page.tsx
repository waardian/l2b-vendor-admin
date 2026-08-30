"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { getToken } from "@/lib/api";

const CHECKLIST_KEY = "l2b_staged_upload_checks";

const STEPS = [
  {
    n: 1,
    title: "The vendor picks a photo",
    body: "Nothing is submitted yet. They are still filling in the form.",
  },
  {
    n: 2,
    title: "The app uploads that one file on its own",
    body: "It calls POST /documents/staged with the file and a document_type saying what it is - pan_card, rc_book, and so on.",
  },
  {
    n: 3,
    title: "The server stores it and returns an id",
    body: "The file now sits on the server belonging to no record yet. It is staged, and it expires after 24 hours if never submitted.",
  },
  {
    n: 4,
    title: "The submit sends the id, not the photo",
    body: "pan_card_document_id: \"7f3a1c2e-...\" instead of a megabyte of base64. The server looks it up and attaches the real file.",
  },
];

const CURL = {
  upload: `curl -X POST "$HOST/documents/staged" \\
  -H "Authorization: Bearer $TOKEN" \\
  -F "file=@./fixtures/pan_card.jpg" \\
  -F "document_type=pan_card" \\
  -F "client_ref=machine-1"`,
  poll: `curl "$HOST/documents/staged/<id>" \\
  -H "Authorization: Bearer $TOKEN"`,
  submit: `curl -X POST "$HOST/onboarding/operator/kyc" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "aadhaar_number": "123456789012",
    "pan_number": "ABCDE1234F",
    "bank_name": "HDFC",
    "bank_branch_name": "MG Road",
    "ifsc_code": "HDFC0001234",
    "bank_linked_mobile": "9876543210",
    "pan_card_document_id": "<id from step 1>",
    "aadhaar_front_document_id": "<another id>",
    "cancelled_cheque_document_id": "<another id>"
  }'`,
  verify: `curl "$HOST/documents/staged" \\
  -H "Authorization: Bearer $TOKEN"
# expect: {"data": {"documents": []}}`,
};

const FIELD_MAP = [
  ["/onboarding/vendor/machines", "machines[].rc_image_base64", "machines[].rc_document_id"],
  ["/onboarding/vendor/skills", "skills[].dl_image_base64", "skills[].dl_document_id"],
  ["/onboarding/vendor/kyc", "pan_card_base64", "pan_card_document_id"],
  ["/onboarding/vendor/company-kyc", "gst_cert_base64", "gst_cert_document_id"],
  ["/onboarding/operator/basic-info", "tpi_certificate_base64", "tpi_certificate_document_id"],
  ["/onboarding/operator/skills", "skills[].dl_front_image_base64", "skills[].dl_front_document_id"],
  ["/onboarding/operator/kyc", "cancelled_cheque_base64", "cancelled_cheque_document_id"],
  ["/rentals/vendor/fleet/add-machines", "machines[].rc_image_base64", "machines[].rc_document_id"],
];

const OCR_STATES = [
  ["pending", "Queued, or the OCR call failed and will be retried at submit", "amber"],
  ["processing", "Verification call in flight", "amber"],
  ["readable", "Read cleanly", "emerald"],
  ["unreadable", "Could not be read - the app asks for a retake", "rose"],
  ["skipped", "This type has no OCR (insurance, TPI, trade licence)", "slate"],
];

const ERRORS = [
  ["unsupported_document_type", "400", "Upload with document_type=passport"],
  ["document_not_found", "404", "Submit a made-up id, or one belonging to another account"],
  ["document_already_attached", "409", "Submit successfully, then submit the same id again"],
  ["document_type_mismatch", "400", "Put a pan_card id into aadhaar_front_document_id"],
  ["duplicate_document_reference", "400", "Send the same id in two slots of one submit"],
  ["document_unavailable", "400", "Storage cannot read the file back - infrastructure fault"],
];

const CHECKS = [
  { id: "happy", label: "Happy path runs end to end", hint: "Upload, poll, submit, then confirm the staged list is empty" },
  { id: "own", label: "Another account cannot use your id", hint: "Stage as vendor A, submit as vendor B - expect 404" },
  { id: "once", label: "An id can only be submitted once", hint: "Submit the same id twice - expect 409 on the second" },
  { id: "slot", label: "Wrong slot is rejected", hint: "PAN id into the Aadhaar field - expect document_type_mismatch" },
  { id: "dupe", label: "Same id twice in one submit is rejected", hint: "Expect duplicate_document_reference" },
  { id: "size", label: "Oversized and wrong-type files are rejected", hint: "7MB file and a .txt - both expect 400" },
  { id: "expiry", label: "Expired staged documents are swept", hint: "Age expires_at, run the sweeper, confirm attached ones survive" },
  { id: "remove", label: "Remove deletes the staged document", hint: "DELETE then submit the id - expect 404" },
  { id: "legacy", label: "Old base64 fields still work", hint: "Send pan_card_base64 instead - expect 200" },
  { id: "gate", label: "Continue stays disabled while uploading", hint: "Both apps - form is not submittable until every file has an id" },
  { id: "preview", label: "Preview and remove icons work", hint: "Both apps - eye opens the file, x clears the field" },
  { id: "verified", label: "Removing a verified document only clears it locally", hint: "The document must stay on the KYC record until replaced" },
  { id: "blurry", label: "A blurry document is flagged at pick time", hint: "Field turns red before the vendor reaches the end of the form" },
  { id: "resume", label: "A half-filled form survives an app restart", hint: "Photos return to the correct machine, not just some machine" },
  { id: "retry", label: "A failed upload offers retry", hint: "Airplane mode, pick a photo, restore network, retry" },
];

export default function DocumentUploadsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsLoggedIn(Boolean(getToken()));
    try {
      const raw = localStorage.getItem(CHECKLIST_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      /* storage unavailable - checklist just starts empty */
    }
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const resetChecks = () => {
    setChecked({});
    try {
      localStorage.removeItem(CHECKLIST_KEY);
    } catch {
      /* ignore */
    }
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const doneCount = CHECKS.filter((c) => checked[c.id]).length;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {isLoggedIn && <Sidebar />}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-8 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {!isLoggedIn && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 font-extrabold text-slate-950 text-xs shadow-xs">
                L2B
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-none">Document Uploads</h1>
              <span className="text-[11px] font-medium text-slate-500">What changed, how it works, how to test</span>
            </div>
            <span className="h-4 w-px bg-slate-200" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              4 new endpoints
            </span>
          </div>
          <Link
            href="/api-docs"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Open API Reference
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-4xl space-y-10">

            {/* ---------- what changed ---------- */}
            <section>
              <SectionHead n="01" title="What changed" />
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Onboarding photos used to travel inside the form submit, base64-encoded. A vendor KYC request
                carried five images at once and could reach 40&nbsp;MB &mdash; and if it failed at 95%, the vendor
                re-sent all five. Now each photo is uploaded on its own the moment it is picked, and the submit
                carries only a short id.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Before</p>
                  <p className="mt-2 font-mono text-xs text-slate-500">app → submit</p>
                  <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-400">≈ 40 MB</p>
                  <p className="mt-1 text-xs text-slate-500">one request, every photo inside</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Now</p>
                  <p className="mt-2 font-mono text-xs text-emerald-700">app → staged → id → submit</p>
                  <p className="mt-3 text-2xl font-extrabold tracking-tight text-emerald-700">≈ 2 KB</p>
                  <p className="mt-1 text-xs text-emerald-700/80">plus one 6&nbsp;MB upload per file</p>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3 font-semibold">Submit endpoint</th>
                      <th className="px-4 py-3 font-semibold">Old field</th>
                      <th className="px-4 py-3 font-semibold">New field</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[11.5px]">
                    {FIELD_MAP.map(([path, oldF, newF]) => (
                      <tr key={path} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 text-slate-700">{path}</td>
                        <td className="px-4 py-2.5 text-slate-400 line-through">{oldF}</td>
                        <td className="px-4 py-2.5 font-semibold text-emerald-700">{newF}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Callout tone="amber" title="Both field names still work">
                The old <Mono>*_base64</Mono> fields are kept so app builds already on the store keep functioning,
                and show as deprecated in Swagger. Current iOS and Android builds send only{" "}
                <Mono>*_document_id</Mono> &mdash; if you see a base64 field going out from a current build, raise it.
              </Callout>
            </section>

            {/* ---------- how it works ---------- */}
            <section>
              <SectionHead n="02" title="How it works" />
              <ol className="mt-4 space-y-2.5">
                {STEPS.map((s) => (
                  <li key={s.n} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 font-mono text-xs font-bold text-white">
                      {s.n}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <h3 className="mt-7 text-xs font-bold uppercase tracking-wider text-slate-400">
                OCR runs in the background
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                The upload returns immediately with <Mono>ocr_status: &quot;pending&quot;</Mono>. Poll{" "}
                <Mono>GET /documents/staged/{"{id}"}</Mono> until it settles &mdash; usually 2&ndash;5 seconds.
              </p>
              <div className="mt-3 grid gap-2">
                {OCR_STATES.map(([state, meaning, tone]) => (
                  <div key={state} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                    <span className={`mt-px shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${toneClass(tone)}`}>
                      {state}
                    </span>
                    <span className="text-xs leading-relaxed text-slate-600">{meaning}</span>
                  </div>
                ))}
              </div>

              <Callout tone="slate" title="Never-settling is not a blocker">
                If OCR stays <Mono>pending</Mono>, the submit still works &mdash; the server runs the check inline at
                that point instead. Slower, same result. Only raise a bug if the submit itself fails.
              </Callout>
            </section>

            {/* ---------- how to test ---------- */}
            <section>
              <SectionHead n="03" title="How to test" />
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Set <Mono>HOST</Mono> to the environment API base ending in <Mono>/api/v1</Mono>, and{" "}
                <Mono>TOKEN</Mono> to a vendor or operator access token. Then run these four in order.
              </p>

              <div className="mt-5 space-y-4">
                <CodeStep
                  n={1}
                  title="Upload the file on its own"
                  note="Returns the document id and a preview_url you can open in a browser."
                  code={CURL.upload}
                  copied={copiedId === "upload"}
                  onCopy={() => copy(CURL.upload, "upload")}
                />
                <CodeStep
                  n={2}
                  title="Poll until OCR settles"
                  note="Repeat until ocr_status is readable, unreadable or skipped."
                  code={CURL.poll}
                  copied={copiedId === "poll"}
                  onCopy={() => copy(CURL.poll, "poll")}
                />
                <CodeStep
                  n={3}
                  title="Submit, sending the id"
                  note="Each id must go in the slot matching its document_type."
                  code={CURL.submit}
                  copied={copiedId === "submit"}
                  onCopy={() => copy(CURL.submit, "submit")}
                />
                <CodeStep
                  n={4}
                  title="Verify the documents moved"
                  note="The staged list must now be empty, and the documents visible against the record in admin."
                  code={CURL.verify}
                  copied={copiedId === "verify"}
                  onCopy={() => copy(CURL.verify, "verify")}
                />
              </div>
            </section>

            {/* ---------- errors ---------- */}
            <section>
              <SectionHead n="04" title="Error codes" />
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Errors arrive as <Mono>{'{"detail": {"code": "...", "message": "..."}}'}</Mono>. Both apps branch on{" "}
                <Mono>code</Mono> and show <Mono>message</Mono>, so check both.
              </p>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3 font-semibold">Code</th>
                      <th className="px-4 py-3 font-semibold">HTTP</th>
                      <th className="px-4 py-3 font-semibold">How to trigger it</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ERRORS.map(([code, http, how]) => (
                      <tr key={code} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 font-mono text-[11.5px] font-semibold text-rose-700">{code}</td>
                        <td className="px-4 py-2.5 font-mono text-[11.5px] text-slate-500">{http}</td>
                        <td className="px-4 py-2.5 text-slate-600">{how}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ---------- checklist ---------- */}
            <section className="pb-10">
              <div className="flex items-end justify-between gap-4">
                <SectionHead n="05" title="Test checklist" />
                <div className="flex shrink-0 items-center gap-3 pb-1">
                  <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                    {doneCount} / {CHECKS.length}
                  </span>
                  <button
                    onClick={resetChecks}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(doneCount / CHECKS.length) * 100}%` }}
                />
              </div>

              <div className="mt-4 space-y-2">
                {CHECKS.map((c) => {
                  const on = Boolean(checked[c.id]);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      aria-pressed={on}
                      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                        on
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                          on ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
                        }`}
                      >
                        {on && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span>
                        <span className={`block text-sm font-semibold ${on ? "text-emerald-900" : "text-slate-800"}`}>
                          {c.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">{c.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <Callout tone="slate" title="Filing a bug?">
                Include the <Mono>document_id</Mono>, the <Mono>ocr_status</Mono> at the time, the full error
                envelope, and whether the environment was on S3 or local fallback. Those four turn most of these
                reports into a five-minute fix.
              </Callout>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}

function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-slate-200 pb-2">
      <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{n}</span>
      <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11.5px] text-slate-700">{children}</code>
  );
}

function toneClass(tone: string) {
  switch (tone) {
    case "emerald":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "rose":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    case "amber":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    default:
      return "bg-slate-100 text-slate-600 border border-slate-200";
  }
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "amber" | "slate";
  title: string;
  children: React.ReactNode;
}) {
  const styles =
    tone === "amber"
      ? "border-amber-200 bg-amber-50/70"
      : "border-slate-200 bg-slate-100/70";
  return (
    <div className={`mt-5 rounded-2xl border px-4 py-3.5 ${styles}`}>
      <p className="text-xs font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

function CodeStep({
  n,
  title,
  note,
  code,
  copied,
  onCopy,
}: {
  n: number;
  title: string;
  note: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 font-mono text-[11px] font-bold text-white">
            {n}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="text-[11px] text-slate-500">{note}</p>
          </div>
        </div>
        <button
          onClick={onCopy}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-slate-900 px-4 py-3.5 font-mono text-[11.5px] leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}
