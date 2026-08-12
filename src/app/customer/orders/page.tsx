"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/http";
import {
  clearCustomerToken,
  customerApi,
  getCustomerToken,
} from "@/lib/customer-api";
import type { CustomerOrder, CustomerProfile } from "@/lib/customer-types";
import OrderCard from "@/components/customer/OrderCard";
import PlaceOrderForm from "@/components/customer/PlaceOrderForm";

const POLL_INTERVAL_MS = 10000;

type Tab = "place" | "orders";

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("place");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const signOut = useRef(() => {
    clearCustomerToken();
    router.replace("/customer/login");
  });

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await customerApi.listOrders());
      setLastSyncedAt(new Date());
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        signOut.current();
        return;
      }
      setError(e instanceof ApiError ? e.message : "Failed to load orders");
    }
  }, []);

  useEffect(() => {
    if (!getCustomerToken()) {
      router.replace("/customer/login");
      return;
    }
    setReady(true);
    customerApi
      .me()
      .then(setProfile)
      .catch(() => signOut.current());
    loadOrders();
  }, [router, loadOrders]);

  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(loadOrders, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [ready, loadOrders]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Authenticating customer session…</span>
        </div>
      </div>
    );
  }

  const applyOrder = (updated: CustomerOrder) =>
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Bar */}
      <header className="border-b border-slate-200/80 bg-white shadow-2xs">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 font-extrabold text-slate-950 shadow-md shadow-amber-500/20">
              L2B
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                Link2Build Customer
              </p>
              <p className="text-xs font-medium text-slate-500">
                {profile ? `${profile.name ?? "Customer Account"} · ${profile.phone}` : "Loading account profile…"}
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut.current()}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
          >
            Log Out
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto flex max-w-5xl gap-4 px-6 pt-2">
          <TabButton active={tab === "place"} onClick={() => setTab("place")}>
            ⚡ Place New Order
          </TabButton>
          <TabButton active={tab === "orders"} onClick={() => setTab("orders")}>
            📋 My Orders ({orders.length})
          </TabButton>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 shadow-2xs">
            ⚠️ {error}
          </div>
        )}

        {tab === "place" ? (
          <PlaceOrderForm
            onPlaced={(order) => {
              setOrders((prev) => [order, ...prev]);
              setTab("orders");
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
              <p className="text-xs font-medium text-slate-500">
                Auto sync active ({POLL_INTERVAL_MS / 1000}s)
                {lastSyncedAt ? ` · Last updated at ${lastSyncedAt.toLocaleTimeString()}` : ""}
              </p>
              <button
                onClick={loadOrders}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
              >
                Refresh Now
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center shadow-2xs">
                <p className="text-base font-bold text-slate-800">No active rental orders</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Place an order from the &quot;Place New Order&quot; tab to start tracking live equipment deployment.
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <OrderCard key={order.id} order={order} onChanged={applyOrder} />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-3 text-xs font-extrabold uppercase tracking-wider transition-all ${
        active
          ? "border-amber-500 text-amber-600"
          : "border-transparent text-slate-400 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
