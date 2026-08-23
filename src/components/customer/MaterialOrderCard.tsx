"use client";

import { useState } from "react";
import { MaterialOrder, MaterialSubOrder } from "@/lib/customer-types";
import { customerApi } from "@/lib/customer-api";

interface Props {
  order: MaterialOrder;
  onUpdated?: () => void;
}

export default function MaterialOrderCard({ order, onUpdated }: Props) {
  const [cancelling, setCancelling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return {
          pill: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          dot: "bg-emerald-500",
          label: "Delivered",
        };
      case "dispatched":
        return {
          pill: "bg-blue-50 text-blue-700 border-blue-200/80",
          dot: "bg-blue-500",
          label: "Out for Delivery",
        };
      case "ready":
        return {
          pill: "bg-violet-50 text-violet-700 border-violet-200/80",
          dot: "bg-violet-500",
          label: "Ready for Pickup",
        };
      case "confirmed":
      case "accepted":
        return {
          pill: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
          dot: "bg-indigo-500",
          label: "Vendor Accepted",
        };
      case "pending_vendor_acceptance":
        return {
          pill: "bg-amber-50 text-amber-800 border-amber-200/80",
          dot: "bg-amber-500",
          label: "Awaiting Supplier Acceptance",
        };
      case "placed":
      case "pending":
      case "pending_payment":
        return {
          pill: "bg-amber-50 text-amber-800 border-amber-200/80",
          dot: "bg-amber-500",
          label: "Order Placed",
        };
      case "cancelled":
        return {
          pill: "bg-rose-50 text-rose-700 border-rose-200/80",
          dot: "bg-rose-500",
          label: "Cancelled",
        };
      default:
        return {
          pill: "bg-slate-100 text-slate-700 border-slate-200",
          dot: "bg-slate-500",
          label: status,
        };
    }
  };

  const getSubOrderStatusStep = (status: string): number => {
    switch (status.toLowerCase()) {
      case "delivered":
        return 4;
      case "dispatched":
        return 3;
      case "ready":
        return 2;
      case "accepted":
      case "confirmed":
        return 1;
      default:
        return 0;
    }
  };

  const statusConfig = getStatusConfig(order.status);
  const subOrders = order.sub_orders || [];
  const isMultiVendor = subOrders.length > 1;

  const totalOrderedQty = order.items.reduce((sum, it) => sum + (it.qty || 0), 0);
  const totalClaimedQty = subOrders.reduce(
    (sum, so) => sum + so.items.reduce((s, it) => s + (it.qty || 0), 0),
    0
  );
  const acceptedCount = subOrders.filter((s) => s.status.toLowerCase() === "accepted").length;
  const readyCount = subOrders.filter((s) => s.status.toLowerCase() === "ready").length;
  const dispatchedCount = subOrders.filter((s) => s.status.toLowerCase() === "dispatched").length;
  const deliveredCount = subOrders.filter((s) => s.status.toLowerCase() === "delivered").length;

  const handleCopyOtp = (otp: string) => {
    navigator.clipboard.writeText(otp);
    setCopiedOtp(otp);
    setTimeout(() => setCopiedOtp(null), 2500);
  };

  const handleCancel = async () => {
    const reason = prompt("Enter cancellation reason:", "Schedule modified");
    if (!reason) return;
    setCancelling(true);
    try {
      await customerApi.cancelMaterialOrder(order.id, reason);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold text-sm shadow-xs">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900">{order.order_number}</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig.pill}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                <span>{statusConfig.label}</span>
              </span>
              {isMultiVendor && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 border border-violet-200">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {subOrders.length} Vendor Deliveries
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ordered on{" "}
              {new Date(order.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {" · "}
              {new Date(order.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-slate-500 font-medium">Grand Total</p>
          <p className="text-base font-bold text-slate-900">
            ₹{order.grand_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <span
            className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              order.payment_mode === "cod"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {order.payment_mode === "cod" ? "Cash on delivery" : "Paid online"}
          </span>
        </div>
      </div>

      {subOrders.length > 0 && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 border border-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Fulfillment Progress:</span>
              <span className="rounded bg-white px-2 py-0.5 font-semibold text-slate-700 border border-slate-200 text-[11px]">
                {subOrders.length} {subOrders.length === 1 ? "Vendor Package" : "Vendor Packages"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {deliveredCount > 0 && (
                <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 font-bold text-emerald-800">
                  {deliveredCount} Delivered
                </span>
              )}
              {dispatchedCount > 0 && (
                <span className="rounded-md bg-blue-100/80 px-2 py-0.5 font-bold text-blue-800">
                  {dispatchedCount} In Transit
                </span>
              )}
              {readyCount > 0 && (
                <span className="rounded-md bg-violet-100/80 px-2 py-0.5 font-bold text-violet-800">
                  {readyCount} Ready
                </span>
              )}
              {acceptedCount > 0 && (
                <span className="rounded-md bg-indigo-100/80 px-2 py-0.5 font-bold text-indigo-800">
                  {acceptedCount} Packing
                </span>
              )}
            </div>
          </div>

          {totalClaimedQty > 0 && totalClaimedQty < totalOrderedQty && (
            <p className="mt-2 text-[11px] text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200/60 font-medium">
              ℹ️ {totalClaimedQty} of {totalOrderedQty} items claimed by suppliers. Remaining {totalOrderedQty - totalClaimedQty} items are in queue for nearby vendors.
            </p>
          )}
        </div>
      )}

      {subOrders.length > 0 ? (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {isMultiVendor ? `Delivery Packages (${subOrders.length})` : "Package Delivery Details"}
              </h4>
              {isMultiVendor && (
                <span className="text-[11px] text-slate-500">
                  · Each vendor dispatches independently with their own completion OTP
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3.5">
            {subOrders.map((so: MaterialSubOrder, idx: number) => {
              const soConfig = getStatusConfig(so.status);
              const step = getSubOrderStatusStep(so.status);
              const isDelivered = so.status.toLowerCase() === "delivered";

              return (
                <div
                  key={so.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 shadow-2xs transition-all hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                          Package {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                          {so.sub_order_number}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${soConfig.pill}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${soConfig.dot}`} />
                          <span>{soConfig.label}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <span>Vendor:</span>
                        <span className="font-semibold text-slate-800">
                          {so.vendor_name || "Materials Supplier"}
                        </span>
                        {so.warehouse_name && (
                          <span className="text-slate-400">({so.warehouse_name})</span>
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500">Package Total: </span>
                      <span className="text-xs font-bold text-slate-900">
                        ₹{so.grand_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3.5 px-2">
                    <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                      {[
                        { num: 1, label: "Accepted", hint: so.ready_at ? "Packed" : "Vendor preparing" },
                        { num: 2, label: "Ready", hint: so.ready_at ? new Date(so.ready_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Packing" },
                        { num: 3, label: "In Transit", hint: so.dispatched_at ? new Date(so.dispatched_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Out for delivery" },
                        { num: 4, label: "Delivered", hint: so.delivered_at ? new Date(so.delivered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Handed over" },
                      ].map((s) => {
                        const isDone = step >= s.num;
                        const isCurrent = step === s.num;
                        return (
                          <div key={s.num} className="flex flex-col items-center">
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                                isDone
                                  ? "bg-emerald-500 text-white"
                                  : isCurrent
                                  ? "bg-amber-500 text-slate-950 ring-2 ring-amber-200"
                                  : "bg-slate-200 text-slate-500"
                              }`}
                            >
                              {isDone ? "✓" : s.num}
                            </div>
                            <span
                              className={`mt-1 font-semibold ${
                                isDone || isCurrent ? "text-slate-900" : "text-slate-400"
                              }`}
                            >
                              {s.label}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              {s.hint}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4">
                    {isDelivered ? (
                      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 text-xs text-emerald-900">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-xs">
                            ✓
                          </span>
                          <div>
                            <p className="font-bold text-emerald-900">Package Delivered &amp; Verified</p>
                            <p className="text-[11px] text-emerald-700">
                              {so.delivered_at
                                ? `Delivered on ${new Date(so.delivered_at).toLocaleString()}`
                                : "Delivery confirmed with customer OTP verification"}
                            </p>
                          </div>
                        </div>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          VERIFIED
                        </span>
                      </div>
                    ) : so.delivery_otp ? (
                      <div className="rounded-lg border-2 border-amber-400/80 bg-gradient-to-r from-amber-50 via-amber-50/60 to-orange-50/50 p-3.5 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 uppercase tracking-wider">
                                Complete Delivery OTP
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {so.driver_name ? `Share with ${so.driver_name}` : "Share at door"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">
                              Share this 4-digit code with the delivery driver to verify and receive this package.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {so.delivery_otp.split("").map((digit: string, dIdx: number) => (
                                <span
                                  key={dIdx}
                                  className="flex h-9 w-7 items-center justify-center rounded-md border border-amber-300 bg-white font-mono text-base font-black text-slate-900 shadow-xs"
                                >
                                  {digit}
                                </span>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyOtp(so.delivery_otp!)}
                              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-amber-100 transition-colors"
                              title="Copy OTP"
                            >
                              {copiedOtp === so.delivery_otp ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {(so.driver_name || so.vehicle_name || so.vehicle_registration) && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 border border-slate-200/80 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 font-bold">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            Driver: {so.driver_name || "Assigned Driver"}
                            {so.driver_phone && (
                              <a
                                href={`tel:${so.driver_phone}`}
                                className="ml-2 font-mono text-blue-600 hover:underline font-semibold"
                              >
                                📞 {so.driver_phone}
                              </a>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Vehicle: {so.vehicle_name || "Logistics Van"}{" "}
                            {so.vehicle_registration && `(${so.vehicle_registration})`}
                          </p>
                        </div>
                      </div>

                      {so.delivery_booking_status && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                          {so.delivery_booking_status}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 space-y-1">
                    <p className="text-[11px] font-semibold text-slate-600">
                      Package Items ({so.items.length})
                    </p>
                    <div className="space-y-1">
                      {so.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between rounded bg-white px-2.5 py-1.5 border border-slate-100 text-xs"
                        >
                          <div>
                            <span className="font-medium text-slate-900">
                              {it.product_name || "Material Item"}
                            </span>
                            {it.variant_name && (
                              <span className="ml-1.5 text-[11px] text-slate-500">
                                · {it.variant_name}
                              </span>
                            )}
                            {it.brand_name && (
                              <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] text-slate-600 font-medium">
                                {it.brand_name}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-slate-900">
                              {it.qty} {it.unit || "Units"}
                            </span>
                            <span className="ml-2 text-slate-500">
                              (₹{it.line_total.toLocaleString("en-IN")})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {order.delivery_otp && (
            <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 uppercase">
                    Delivery OTP
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    Share with delivery person at door
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {order.delivery_otp.split("").map((digit, i) => (
                      <span
                        key={i}
                        className="flex h-9 w-7 items-center justify-center rounded-md border border-amber-300 bg-white font-mono text-base font-black text-slate-900"
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyOtp(order.delivery_otp!)}
                    className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-amber-100"
                  >
                    {copiedOtp === order.delivery_otp ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 flex items-start gap-2">
            <svg className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-amber-950">Awaiting Supplier Acceptance</p>
              <p className="text-[11px] text-amber-800">
                Your order is currently being assigned to nearby verified construction material suppliers. Multi-vendor packages, dispatch tracking, and delivery OTPs will activate once vendors accept your order lines.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">Order Items ({order.items.length})</p>
            <div className="space-y-1.5">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50/80 px-3 py-2 border border-slate-100 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{item.product_name || "Material Product"}</span>
                    {item.variant_name && <span className="ml-1.5 text-slate-500">· {item.variant_name}</span>}
                    {item.brand_name && (
                      <span className="ml-1.5 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200/70">
                        {item.brand_name}
                      </span>
                    )}
                  </div>
                  <div className="text-right font-semibold text-slate-900">
                    {item.qty} {item.unit || "Units"} · ₹{item.line_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        {order.delivery_address && (
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{order.delivery_address.label || "Delivery Location"}</span>
            </div>
            <p className="mt-1 text-slate-600 line-clamp-2">
              {order.delivery_address.full_address}
            </p>
            {order.delivery_address.pincode && (
              <p className="mt-1 text-[11px] text-slate-400">PIN: {order.delivery_address.pincode}</p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>Items Subtotal</span>
            <span>₹{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>GST (18%)</span>
            <span>₹{order.tax_total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Freight / Shipping</span>
            <span>{order.shipping_total > 0 ? `₹${order.shipping_total.toFixed(2)}` : "Free"}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200/70 pt-1">
            <span>Grand Total</span>
            <span>₹{order.grand_total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
        >
          <span>{showHistory ? "Hide Timeline" : "View Tracking Timeline"}</span>
          <svg
            className={`h-3 w-3 transition-transform ${showHistory ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {order.can_cancel && (
          <button
            type="button"
            disabled={cancelling}
            onClick={handleCancel}
            className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors"
          >
            {cancelling ? "Cancelling…" : "Cancel Order"}
          </button>
        )}
      </div>

      {showHistory && (
        <div className="mt-3 rounded-lg bg-slate-900 p-4 text-slate-100">
          <p className="text-xs font-bold text-slate-200">Tracking Timeline</p>
          <div className="mt-3 space-y-3">
            {order.status_history.map((h, i) => (
              <div key={h.id || i} className="flex items-start gap-2.5 text-xs">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white font-bold">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white uppercase tracking-wider text-[11px]">
                    {h.to_status}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {h.created_at ? new Date(h.created_at).toLocaleString() : ""} ·{" "}
                    {h.actor_role || "system"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
