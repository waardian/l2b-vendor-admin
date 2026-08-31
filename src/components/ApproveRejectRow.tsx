"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";

const TERMINAL_SUCCESS_STATUSES = new Set(["verified", "approved"]);

interface Props {
  label: string;
  status: string | null | undefined;
  rejectionReason?: string | null;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  allowRejectWhenApproved?: boolean;
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin text-white"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function ApproveRejectRow({
  label,
  status,
  rejectionReason,
  onApprove,
  onReject,
  disabled,
  onBusyChange,
  allowRejectWhenApproved = false,
}: Props) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isTerminalSuccess = TERMINAL_SUCCESS_STATUSES.has((status ?? "").toLowerCase());
  const locked = disabled || busy !== null;
  const trimmedReason = reason.trim();
  const canConfirmReject = trimmedReason.length > 0 && !locked;

  const setBusyBoth = (value: "approve" | "reject" | null) => {
    setBusy(value);
    onBusyChange?.(value !== null);
  };

  const handleApprove = async () => {
    setBusyBoth("approve");
    setError(null);
    try {
      await onApprove();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve item");
    } finally {
      setBusyBoth(null);
    }
  };

  const handleReject = async () => {
    if (!trimmedReason) {
      setError("Rejection reason is required — partner is shown this message.");
      return;
    }
    setBusyBoth("reject");
    setError(null);
    try {
      await onReject(trimmedReason);
      setShowReject(false);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject item");
    } finally {
      setBusyBoth(null);
    }
  };

  return (
    <div className="border-b border-slate-100 py-3.5 last:border-b-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{label}</span>
          <StatusBadge status={status} />
        </div>

        {isTerminalSuccess ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
              <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Verified & Approved
            </span>
            {allowRejectWhenApproved && (
              <button
                onClick={() => setShowReject((v) => !v)}
                disabled={locked}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 transition-all hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showReject ? "Close" : "Reject"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleApprove}
              disabled={locked}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy === "approve" && <Spinner />}
              {busy === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              onClick={() => setShowReject((v) => !v)}
              disabled={locked}
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 transition-all hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showReject ? "Close" : "Reject"}
            </button>
          </div>
        )}
      </div>

      {rejectionReason && (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 text-xs font-semibold text-rose-800">
          <span className="font-extrabold uppercase tracking-wide">Rejection Reason:</span> {rejectionReason}
        </div>
      )}

      {showReject && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/40 p-3.5 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this document/item rejected? (required for partner)"
              disabled={locked}
              required
              aria-label={`Rejection reason for ${label}`}
              className="flex-1 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleReject}
                disabled={!canConfirmReject}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === "reject" && <Spinner />}
                {busy === "reject" ? "Rejecting…" : "Confirm Rejection"}
              </button>
              <button
                onClick={() => {
                  setShowReject(false);
                  setError(null);
                }}
                disabled={locked}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500">
            This message will be shown directly on the partner&apos;s mobile app verification screen.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
