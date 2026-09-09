"use client";

import { useEffect, useState } from "react";
import { ApiError, integrationApi } from "@/lib/api";
import { API_BASE_URL } from "@/lib/http";
import type { CustomerOrderWebhook } from "@/lib/types";
import { Banner, Field, TextInput } from "@/components/FormKit";

const ORDER_TYPE_NOTES: Record<string, { label: string; audience: string }> = {
  rental: {
    label: "Machine booking",
    audience: "Rental vendors whose fleet matches the SKU and who are inside the service radius",
  },
  material: {
    label: "Materials order",
    audience: "Material vendors stocking the ordered variants within their warehouse radius",
  },
};

function serverOrigin(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "");
}

function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function IntegrationsPage() {
  const [webhook, setWebhook] = useState<CustomerOrderWebhook | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [customSecret, setCustomSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    integrationApi
      .getCustomerOrderWebhook()
      .then((data) => {
        if (alive) setWebhook(data);
      })
      .catch((err) => {
        if (alive) {
          setError(err instanceof ApiError ? err.message : "Could not load the webhook settings.");
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function run(action: () => Promise<CustomerOrderWebhook>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await action();
      setWebhook(next);
      setRevealed(true);
      setNotice(message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That change could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Your browser blocked the clipboard. Select the text and copy it manually.");
    }
  }

  const endpointUrl = `${serverOrigin()}${webhook?.webhook_path ?? "/api/v1/webhooks/orders/placed"}`;
  const secret = webhook?.secret ?? null;

  const sourceTone =
    webhook?.source === "database"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : webhook?.source === "environment"
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : "bg-rose-50 text-rose-700 border-rose-200";

  const sourceLabel =
    webhook?.source === "database"
      ? "Set from this page"
      : webhook?.source === "environment"
        ? "From server environment"
        : "Not configured";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-xl font-bold text-slate-900">Customer order webhook</h1>
        <p className="max-w-3xl text-sm text-slate-500">
          The customer server calls this endpoint the moment an order is placed. It is what puts a new
          order in front of every vendor who can fulfil it — in their notification inbox and as a push.
          Share the endpoint and secret below with the customer backend team.
        </p>
      </header>

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading webhook settings…
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="rounded-md border border-amber-300 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-amber-700">
                  POST
                </span>
                <span className="font-mono text-sm break-all text-slate-900">{endpointUrl}</span>
              </div>
              <button
                onClick={() => copy(endpointUrl, "endpoint")}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                {copied === "endpoint" ? "Copied" : "Copy URL"}
              </button>
            </div>

            <dl className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="px-6 py-4">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Secret header</dt>
                <dd className="mt-1 font-mono text-sm text-slate-900">{webhook?.secret_header}</dd>
              </div>
              <div className="px-6 py-4">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sourceTone}`}>
                    {sourceLabel}
                  </span>
                </dd>
              </div>
              <div className="px-6 py-4">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Last changed</dt>
                <dd className="mt-1 text-sm text-slate-700">{formatWhen(webhook?.rotated_at)}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Shared secret</h2>
              <p className="mt-1 text-xs text-slate-500">
                Sent by the customer server as the <span className="font-mono">{webhook?.secret_header}</span> header on
                every call. A new secret takes effect immediately, so hand it over before you change it.
              </p>
            </div>

            {!webhook?.is_configured && (
              <Banner tone="warning">
                No secret is set, so the endpoint currently accepts unsigned calls. Generate one before this
                environment is reachable from the internet.
              </Banner>
            )}

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <code className="flex-1 break-all font-mono text-sm text-slate-900">
                {secret ? (revealed ? secret : webhook?.masked_secret) : "Not set"}
              </code>
              {secret && (
                <>
                  <button
                    onClick={() => setRevealed((v) => !v)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    {revealed ? "Hide" : "Reveal"}
                  </button>
                  <button
                    onClick={() => copy(secret, "secret")}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    {copied === "secret" ? "Copied" : "Copy"}
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
              <div className="min-w-64 flex-1">
                <Field label="Set a specific secret" hint="At least 16 characters, no spaces. Leave empty to generate one instead.">
                  <TextInput
                    value={customSecret}
                    onChange={setCustomSecret}
                    placeholder="Paste the value agreed with the customer team"
                  />
                </Field>
              </div>
              <button
                disabled={busy || customSecret.trim().length === 0}
                onClick={() =>
                  run(() => integrationApi.setSecret(customSecret.trim()), "Secret saved. It is live now.").then(() =>
                    setCustomSecret("")
                  )
                }
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save secret
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  run(
                    () => integrationApi.rotateSecret(),
                    "New secret generated. Send it to the customer team — the old one stopped working."
                  )
                }
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Generate new secret
              </button>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">What the customer server sends</h2>
              <p className="mt-1 text-xs text-slate-500">
                These are the only values the endpoint accepts. Anything else is rejected with a 400 rather
                than being silently dropped.
              </p>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">event</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {(webhook?.accepted_events ?? []).map((event) => (
                  <span
                    key={event}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-800"
                  >
                    {event}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">order_type</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-116 text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-2 pr-4 font-bold">Value</th>
                      <th className="py-2 pr-4 font-bold">Meaning</th>
                      <th className="py-2 font-bold">Who gets notified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(webhook?.accepted_order_types ?? []).map((type) => (
                      <tr key={type} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-900">{type}</td>
                        <td className="py-2.5 pr-4 text-slate-700">{ORDER_TYPE_NOTES[type]?.label ?? "—"}</td>
                        <td className="py-2.5 text-slate-500">{ORDER_TYPE_NOTES[type]?.audience ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Example call</h3>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
{`curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "${webhook?.secret_header}: ${revealed && secret ? secret : "<secret>"}" \\
  -d '{
    "event": "order.placed",
    "order_type": "material",
    "order_id": "<l2b order id>",
    "order_number": "MAT-20260907-6132"
  }'`}
              </pre>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
