"use client";

import { useState } from "react";
import { ApiError } from "@/lib/http";
import { customerApi } from "@/lib/customer-api";
import type { CustomerOrder } from "@/lib/customer-types";

const STATUS_TONES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-blue-100 text-blue-900",
  operator_assigned: "bg-indigo-100 text-indigo-900",
  in_progress: "bg-green-100 text-green-900",
  completed: "bg-gray-200 text-gray-900",
  cancelled: "bg-red-100 text-red-900",
  rejected: "bg-red-100 text-red-900",
  expired: "bg-red-100 text-red-900",
};

const STATUS_HINTS: Record<string, string> = {
  pending: "Waiting for a vendor to accept",
  confirmed: "Vendor accepted, machine being assigned",
  operator_assigned: "Operator assigned, arriving for the job",
  in_progress: "Job under way",
  completed: "Job finished",
  cancelled: "Order cancelled",
  rejected: "No vendor took this order",
  expired: "Order expired",
};

function humanise(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function OrderCard({
  order,
  onChanged,
}: {
  order: CustomerOrder;
  onChanged: (order: CustomerOrder) => void;
}) {
  const [hours, setHours] = useState(2);
  const [busy, setBusy] = useState<null | "extend" | "cancel">(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (kind: "extend" | "cancel") => {
    setBusy(kind);
    setError(null);
    try {
      const updated =
        kind === "extend"
          ? await customerApi.requestExtension(order.id, hours)
          : await customerApi.cancelOrder(order.id, "Cancelled by customer");
      onChanged(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const pending = order.pending_extension;

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">{order.sku_name}</p>
          <p className="text-xs text-gray-500">{order.booking_number}</p>
        </div>
        <div className="text-right">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              STATUS_TONES[order.status] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {humanise(order.status)}
          </span>
          <p className="mt-1 text-xs text-gray-500">
            {order.task_paused_at ? "Paused" : STATUS_HINTS[order.status] ?? ""}
          </p>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs md:grid-cols-4">
        <Detail label="Scheduled start" value={formatDateTime(order.scheduled_start)} />
        <Detail label="Scheduled end" value={formatDateTime(order.scheduled_end)} />
        <Detail label="Actual start" value={formatDateTime(order.actual_start)} />
        <Detail label="Actual end" value={formatDateTime(order.actual_end)} />
        <Detail label="Hours booked" value={order.hours_booked ? `${order.hours_booked} h` : "—"} />
        <Detail label="Total" value={`₹${order.amounts.total_amount.toLocaleString()}`} />
        <Detail label="Site" value={order.site_address ?? "—"} />
        <Detail label="Work type" value={order.work_type ?? "—"} />
        <Detail label="Operator" value={order.assigned_operator_name ?? "Not assigned"} />
        <Detail
          label="Payment"
          value={
            order.payment
              ? `${order.payment.gateway.toUpperCase()} · ${humanise(order.payment.status)}`
              : "—"
          }
        />
      </dl>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Amount breakdown
          </p>
          <AmountLine label="Machine hire" value={order.amounts.base_amount} />
          <AmountLine label="Attachments" value={order.amounts.attachment_amount} />
          <AmountLine label="Diesel surcharge" value={order.amounts.diesel_surcharge} />
          <AmountLine label="Toll charges" value={order.amounts.toll_charges} />
          <AmountLine label="Extension" value={order.amounts.extension_amount} />
          <AmountLine label="Discount" value={-order.amounts.discount_amount} />
          <AmountLine
            label={`Coupon${order.amounts.coupon_code ? ` (${order.amounts.coupon_code})` : ""}`}
            value={-order.amounts.coupon_discount}
          />
          {order.amounts.price_adjustment !== 0 && (
            <AmountLine label="Price adjustment" value={order.amounts.price_adjustment} />
          )}
          <div className="mt-2 flex justify-between border-t border-gray-300 pt-2 font-bold text-gray-900">
            <span>Total</span>
            <span>₹{order.amounts.total_amount.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-3">
          {order.attachments.length > 0 && (
            <div className="rounded-md border border-gray-200 px-4 py-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Attachments
              </p>
              <ul className="space-y-0.5 text-sm text-gray-800">
                {order.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex justify-between">
                    <span>
                      {attachment.name} × {attachment.quantity}
                    </span>
                    <span>₹{attachment.line_total.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {order.site_images.length > 0 && (
            <div className="rounded-md border border-gray-200 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Site images
              </p>
              <div className="flex flex-wrap gap-2">
                {order.site_images.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Site"
                      className="h-14 w-14 rounded border border-gray-200 object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <OtpBox
          label="Start OTP"
          code={order.start_otp}
          verifiedAt={order.start_otp_verified_at}
          blurb="Share with the operator to start the job"
        />
        <OtpBox
          label="End OTP"
          code={order.end_otp}
          verifiedAt={order.end_otp_verified_at}
          blurb="Share when the job is done"
        />
      </div>

      {pending && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Extension of {pending.extended_by_hours} h (₹
          {pending.extension_cost.toLocaleString()}) waiting for the vendor. Would run till{" "}
          {formatDateTime(pending.extend_till)}. Vendor must answer by{" "}
          {formatDateTime(pending.response_deadline)}.
        </p>
      )}

      {order.extensions.filter((e) => e.status !== "pending").length > 0 && (
        <ul className="mt-3 space-y-1">
          {order.extensions
            .filter((e) => e.status !== "pending")
            .map((extension) => (
              <li key={extension.id} className="text-xs text-gray-600">
                {humanise(extension.status)} · {extension.extended_by_hours} h · ₹
                {extension.extension_cost.toLocaleString()}
                {extension.rejection_reason ? ` · ${extension.rejection_reason}` : ""}
              </li>
            ))}
        </ul>
      )}

      {order.cancellation_reason && (
        <p className="mt-3 text-xs text-red-700">Cancelled: {order.cancellation_reason}</p>
      )}

      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          disabled={!order.can_request_extension}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400"
        >
          {[1, 2, 3, 4, 6, 8].map((value) => (
            <option key={value} value={value}>
              +{value} hours
            </option>
          ))}
        </select>
        <button
          onClick={() => act("extend")}
          disabled={!order.can_request_extension || busy !== null}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
        >
          {busy === "extend" ? "Requesting…" : "Request extension"}
        </button>
        {order.can_cancel && (
          <button
            onClick={() => act("cancel")}
            disabled={busy !== null}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            {busy === "cancel" ? "Cancelling…" : "Cancel order"}
          </button>
        )}
      </div>
    </article>
  );
}

function AmountLine({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-gray-700">
      <span>{label}</span>
      <span>₹{value.toLocaleString()}</span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function OtpBox({
  label,
  code,
  verifiedAt,
  blurb,
}: {
  label: string;
  code: string | null;
  verifiedAt: string | null;
  blurb: string;
}) {
  return (
    <div
      className={`rounded-md border px-4 py-3 ${
        verifiedAt ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold tracking-widest text-gray-900">
        {code ?? "—"}
      </p>
      <p className="text-xs text-gray-600">
        {verifiedAt ? `Verified ${formatDateTime(verifiedAt)}` : blurb}
      </p>
    </div>
  );
}
