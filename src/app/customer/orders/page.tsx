"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/http";
import {
  clearCustomerToken,
  customerApi,
  getCustomerToken,
} from "@/lib/customer-api";
import type {
  CustomerOrder,
  CustomerProfile,
  MaterialOrder,
  UserAddress,
} from "@/lib/customer-types";
import OrderCard from "@/components/customer/OrderCard";
import PlaceOrderForm from "@/components/customer/PlaceOrderForm";
import MaterialOrderCard from "@/components/customer/MaterialOrderCard";
import PlaceMaterialOrderForm from "@/components/customer/PlaceMaterialOrderForm";
import DeliveryAddressManager from "@/components/customer/DeliveryAddressManager";

const POLL_INTERVAL_MS = 10000;

type Section = "materials" | "rentals";
type MaterialTab = "orders" | "place" | "addresses";
type RentalTab = "place" | "orders";

export default function CustomerOrdersPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<Section>("materials");
  const [materialTab, setMaterialTab] = useState<MaterialTab>("orders");
  const [rentalTab, setRentalTab] = useState<RentalTab>("place");

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [rentalOrders, setRentalOrders] = useState<CustomerOrder[]>([]);
  const [materialOrders, setMaterialOrders] = useState<MaterialOrder[]>([]);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const signOut = useRef(() => {
    clearCustomerToken();
    router.replace("/customer/login");
  });

  const loadData = useCallback(async () => {
    try {
      const [rOrders, mOrders, addrs] = await Promise.all([
        customerApi.listOrders(),
        customerApi.listMaterialOrders(),
        customerApi.listAddresses(),
      ]);
      setRentalOrders(rOrders);
      setMaterialOrders(mOrders);
      setAddresses(addrs);
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
    loadData();
  }, [router, loadData]);

  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(loadData, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [ready, loadData]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs font-medium text-slate-400">Authenticating customer session…</span>
        </div>
      </div>
    );
  }

  const applyRentalOrder = (updated: CustomerOrder) =>
    setRentalOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 font-bold text-amber-400 text-xs tracking-wider">
              L2B
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">
                Link2Build
              </p>
              <p className="text-[11px] text-slate-500">
                {profile ? `${profile.name ?? "Customer"} · ${profile.phone}` : "Loading profile…"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setSection("materials")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  section === "materials"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Building Materials ({materialOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setSection("rentals")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  section === "rentals"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Machinery Rentals ({rentalOrders.length})
              </button>
            </div>

            <button
              onClick={() => signOut.current()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>

        <div className="mx-auto flex max-w-5xl gap-6 px-6">
          {section === "materials" ? (
            <>
              <TabButton active={materialTab === "orders"} onClick={() => setMaterialTab("orders")}>
                Material Orders ({materialOrders.length})
              </TabButton>
              <TabButton active={materialTab === "place"} onClick={() => setMaterialTab("place")}>
                Place Material Order
              </TabButton>
              <TabButton
                active={materialTab === "addresses"}
                onClick={() => setMaterialTab("addresses")}
              >
                Delivery Addresses ({addresses.length})
              </TabButton>
            </>
          ) : (
            <>
              <TabButton active={rentalTab === "place"} onClick={() => setRentalTab("place")}>
                Book Machinery
              </TabButton>
              <TabButton active={rentalTab === "orders"} onClick={() => setRentalTab("orders")}>
                Rental Bookings ({rentalOrders.length})
              </TabButton>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        {error && (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <svg className="h-4 w-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {section === "materials" ? (
          materialTab === "place" ? (
            <PlaceMaterialOrderForm
              addresses={addresses}
              onAddressChange={loadData}
              onPlaced={(order) => {
                setMaterialOrders((prev) => [order, ...prev]);
                setMaterialTab("orders");
              }}
            />
          ) : materialTab === "addresses" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <DeliveryAddressManager
                addresses={addresses}
                onAddressChange={loadData}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-white px-4 py-2.5 border border-slate-200 text-xs shadow-2xs">
                <span className="text-slate-500">
                  Auto-sync active ({POLL_INTERVAL_MS / 1000}s)
                  {lastSyncedAt ? ` · Last synced ${lastSyncedAt.toLocaleTimeString()}` : ""}
                </span>
                <button
                  onClick={loadData}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Refresh
                </button>
              </div>

              {materialOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">No material orders yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Place an order to start tracking delivery status and materials deployment.
                  </p>
                  <button
                    onClick={() => setMaterialTab("place")}
                    className="mt-4 inline-flex items-center rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors"
                  >
                    Place Material Order
                  </button>
                </div>
              ) : (
                materialOrders.map((order) => (
                  <MaterialOrderCard key={order.id} order={order} onUpdated={loadData} />
                ))
              )}
            </div>
          )
        ) : rentalTab === "place" ? (
          <PlaceOrderForm
            onPlaced={(order) => {
              setRentalOrders((prev) => [order, ...prev]);
              setRentalTab("orders");
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-white px-4 py-2.5 border border-slate-200 text-xs shadow-2xs">
              <span className="text-slate-500">
                Auto-sync active ({POLL_INTERVAL_MS / 1000}s)
                {lastSyncedAt ? ` · Last synced ${lastSyncedAt.toLocaleTimeString()}` : ""}
              </span>
              <button
                onClick={loadData}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Refresh
              </button>
            </div>

            {rentalOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">No active rental orders</p>
                <p className="mt-1 text-xs text-slate-500">
                  Place an order from the Book Machinery tab to track live equipment bookings.
                </p>
              </div>
            ) : (
              rentalOrders.map((order) => (
                <OrderCard key={order.id} order={order} onChanged={applyRentalOrder} />
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
      className={`-mb-px border-b-2 py-3 text-xs font-semibold transition-all ${
        active
          ? "border-slate-900 text-slate-900 font-bold"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}
