"use client";

import { useEffect, useState } from "react";
import { legacyAdminApi, ApiError } from "@/lib/api";
import type { LegacyPendingVendor } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import Section from "@/components/Section";

export default function LegacyAdminPage() {
  const [pending, setPending] = useState<LegacyPendingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const [formUserId, setFormUserId] = useState("");
  const [formMachineId, setFormMachineId] = useState("");
  const [formDocType, setFormDocType] = useState<"rc" | "insurance" | "tpi">("rc");
  const [formStatus, setFormStatus] = useState<"verified" | "rejected">("verified");
  const [formReason, setFormReason] = useState("");
  const [formResult, setFormResult] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setPending(await legacyAdminApi.listPending());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load pending vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (userId: string) => {
    setBusyId(userId);
    setError(null);
    try {
      await legacyAdminApi.approve(userId);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to approve");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (userId: string) => {
    setBusyId(userId);
    setError(null);
    try {
      await legacyAdminApi.reject(userId, reasons[userId] ?? "");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to reject");
    } finally {
      setBusyId(null);
    }
  };

  const submitMachineReview = async () => {
    setFormBusy(true);
    setFormResult(null);
    try {
      const res = await legacyAdminApi.reviewMachineDocument(
        formUserId,
        formMachineId,
        formDocType,
        formStatus,
        formReason || undefined
      );
      setFormResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setFormResult(e instanceof ApiError ? `Error: ${e.message}` : "Failed");
    } finally {
      setFormBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Legacy Admin Console</h1>
          <p className="text-xs font-medium text-slate-500">
            Raw endpoint test panel for direct `/admin/*` operations.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-slate-900/90 px-3 py-1.5 font-mono text-[11px] font-semibold text-amber-400 border border-slate-800 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Legacy Admin API
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 shadow-2xs">
          {error}
        </div>
      )}

      <Section title="GET /admin/vendors/pending">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="text-left">Vendor Name</th>
                <th className="text-left">Phone Number</th>
                <th className="text-left">Role</th>
                <th className="text-center">Status</th>
                <th className="text-left">Rejection Reason</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs font-semibold text-slate-400">
                    Loading pending vendors…
                  </td>
                </tr>
              ) : pending.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs font-semibold text-slate-400">
                    No pending vendors found.
                  </td>
                </tr>
              ) : (
                pending.map((v) => (
                  <tr key={v.user_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="font-bold text-slate-900">{v.name || "(no name)"}</td>
                    <td className="font-mono text-xs font-semibold text-slate-600">{v.phone}</td>
                    <td className="text-slate-700">{v.role}</td>
                    <td className="text-center">
                      <StatusBadge status={v.onboarding_status} />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={reasons[v.user_id] ?? ""}
                        onChange={(e) =>
                          setReasons((r) => ({ ...r, [v.user_id]: e.target.value }))
                        }
                        placeholder="Rejection reason…"
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                      />
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          disabled={busyId !== null}
                          onClick={() => approve(v.user_id)}
                          className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all"
                        >
                          {busyId === v.user_id ? "Approving…" : "Approve"}
                        </button>
                        <button
                          disabled={busyId !== null}
                          onClick={() => reject(v.user_id)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-all"
                        >
                          {busyId === v.user_id ? "Rejecting…" : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="POST /admin/vendors/{user_id}/machines/{machine_id}/review">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <LabeledInput label="user_id" value={formUserId} onChange={setFormUserId} />
            <LabeledInput label="machine_id" value={formMachineId} onChange={setFormMachineId} />
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                doc_type
              </label>
              <select
                value={formDocType}
                onChange={(e) => setFormDocType(e.target.value as "rc" | "insurance" | "tpi")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
              >
                <option value="rc">rc</option>
                <option value="insurance">insurance</option>
                <option value="tpi">tpi</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as "verified" | "rejected")}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
              >
                <option value="verified">verified</option>
                <option value="rejected">rejected</option>
              </select>
            </div>
            <LabeledInput label="rejection_reason" value={formReason} onChange={setFormReason} />
          </div>

          <button
            disabled={formBusy || !formUserId || !formMachineId}
            onClick={submitMachineReview}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-sm hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all"
          >
            {formBusy ? "Submitting Review…" : "Submit Machine Document Review"}
          </button>

          {formResult && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-amber-400 shadow-xl overflow-x-auto">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-1">
                API JSON Response Output
              </p>
              <pre>{formResult}</pre>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none"
      />
    </div>
  );
}
