"use client";

import { useEffect, useMemo, useState } from "react";
import { vendorApi, ApiError } from "@/lib/api";
import type { VendorListItem, VendorWarehouse } from "@/lib/types";
import WarehouseMapPicker, {
  MAPS_API_KEY,
  formatCoordinate,
  type LatLng,
} from "@/components/WarehouseMapPicker";

const MATERIAL_VENDOR = "material_vendor";

const SOURCE_LABELS: Record<string, string> = {
  device: "Vendor GPS",
  map_pin: "Vendor pin",
  admin: "Admin pin",
};

function parseCoordinate(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidPoint(point: LatLng | null): point is LatLng {
  if (!point) return false;
  return (
    point.lat >= -90 && point.lat <= 90 && point.lng >= -180 && point.lng <= 180
  );
}

export default function WarehousesPage() {
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [point, setPoint] = useState<LatLng | null>(null);
  const [latText, setLatText] = useState("");
  const [lngText, setLngText] = useState("");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    vendorApi
      .list({ category: MATERIAL_VENDOR })
      .then((data) => {
        if (!cancelled) setVendors(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof ApiError ? e.message : "Failed to load material vendors");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const retryLoad = () => {
    setLoading(true);
    setLoadError(null);
    setReloadToken((token) => token + 1);
  };

  const selected = useMemo(
    () => vendors.find((v) => v.user_id === selectedUserId) ?? null,
    [vendors, selectedUserId]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (onlyMissing && v.warehouse) return false;
      if (!query) return true;
      return (
        v.name?.toLowerCase().includes(query) ||
        v.phone?.includes(query) ||
        v.vendor_code?.toLowerCase().includes(query)
      );
    });
  }, [vendors, search, onlyMissing]);

  const pinnedCount = vendors.filter((v) => v.warehouse).length;
  const missingCount = vendors.length - pinnedCount;

  const selectVendor = (vendor: VendorListItem) => {
    setSelectedUserId(vendor.user_id);
    setSaveError(null);
    setSavedAt(null);

    const existing = vendor.warehouse ?? null;
    applyWarehouse(existing);
  };

  const applyWarehouse = (warehouse: VendorWarehouse | null) => {
    if (warehouse) {
      const next = { lat: warehouse.latitude, lng: warehouse.longitude };
      setPoint(next);
      setLatText(formatCoordinate(next.lat));
      setLngText(formatCoordinate(next.lng));
      setAddress(warehouse.address ?? "");
      setLabel(warehouse.label ?? "");
    } else {
      setPoint(null);
      setLatText("");
      setLngText("");
      setAddress("");
      setLabel("");
    }
  };

  const onMapMoved = (next: LatLng) => {
    setPoint(next);
    setLatText(formatCoordinate(next.lat));
    setLngText(formatCoordinate(next.lng));
  };

  const commitTypedCoordinates = (nextLat: string, nextLng: string) => {
    const lat = parseCoordinate(nextLat);
    const lng = parseCoordinate(nextLng);
    if (lat === null || lng === null) return;
    const candidate = { lat, lng };
    if (isValidPoint(candidate)) setPoint(candidate);
  };

  const save = async () => {
    if (!selected || !isValidPoint(point)) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await vendorApi.setWarehouse(selected.user_id, {
        latitude: point.lat,
        longitude: point.lng,
        address: address.trim() || null,
        label: label.trim() || null,
      });
      setVendors((current) =>
        current.map((v) => (v.user_id === saved.vendor_id || v.user_id === selected.user_id ? { ...v, warehouse: saved } : v))
      );
      applyWarehouse(saved);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Could not save the warehouse pin");
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(selected) && isValidPoint(point) && !saving;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Warehouse Locations</h1>
          <p className="text-xs font-medium text-slate-500">
            The pin a material vendor&apos;s order feed is measured from — they only see orders
            dropping within 6&nbsp;km of it.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 font-mono text-[11px] font-semibold text-amber-400 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          PUT /rentals/admin/vendors/{"{user_id}"}/warehouse
        </div>
      </div>

      {!MAPS_API_KEY && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold text-amber-900">Google Maps key not configured</p>
          <p className="mt-1 text-xs font-medium text-amber-800">
            Set <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
            in <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">.env.local</code> to pin on a
            map. Coordinates can still be entered by hand.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Material Vendors", value: vendors.length, tone: "text-slate-900", chip: "bg-slate-100 text-slate-600" },
          { label: "Warehouse Pinned", value: pinnedCount, tone: "text-emerald-600", chip: "bg-emerald-50 text-emerald-600" },
          { label: "Awaiting A Pin", value: missingCount, tone: "text-amber-600", chip: "bg-amber-50 text-amber-600" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>{kpi.label}</span>
              <span className={`rounded-full p-2 ${kpi.chip}`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
            </div>
            <p className={`mt-3 text-3xl font-extrabold tracking-tight ${kpi.tone}`}>
              {loading ? "—" : kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="flex max-h-[720px] flex-col rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="space-y-3 border-b border-slate-100 p-4">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone or code…"
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={onlyMissing}
                onChange={(e) => setOnlyMissing(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 accent-amber-500"
              />
              Only vendors without a pin
            </label>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading && <p className="p-4 text-xs font-semibold text-slate-400">Loading vendors…</p>}

            {loadError && (
              <div className="p-4">
                <p className="text-xs font-semibold text-rose-600">{loadError}</p>
                <button
                  onClick={retryLoad}
                  className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-amber-400 hover:bg-slate-800"
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !loadError && filtered.length === 0 && (
              <p className="p-4 text-xs font-semibold text-slate-400">No material vendors match.</p>
            )}

            {filtered.map((vendor) => {
              const active = vendor.user_id === selectedUserId;
              return (
                <button
                  key={vendor.user_id}
                  onClick={() => selectVendor(vendor)}
                  className={`mb-1 flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                    active
                      ? "border border-amber-500/40 bg-amber-500/10"
                      : "border border-transparent hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      vendor.warehouse ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-900">
                      {vendor.name ?? "Unnamed vendor"}
                    </span>
                    <span className="block truncate text-[11px] font-medium text-slate-500">
                      {vendor.phone}
                      {vendor.vendor_code ? ` · ${vendor.vendor_code}` : ""}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[10px] font-semibold text-slate-400">
                      {vendor.warehouse
                        ? `${formatCoordinate(vendor.warehouse.latitude)}, ${formatCoordinate(vendor.warehouse.longitude)}`
                        : "No warehouse pinned"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          {!selected ? (
            <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <span className="rounded-full bg-slate-100 p-3 text-slate-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <p className="text-sm font-bold text-slate-900">Pick a vendor to place their pin</p>
              <p className="max-w-xs text-xs font-medium text-slate-500">
                Drag the map so the crosshair sits on their yard, then save.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">
                    {selected.name ?? "Unnamed vendor"}
                  </h2>
                  <p className="text-[11px] font-medium text-slate-500">
                    {selected.phone}
                    {selected.vendor_code ? ` · ${selected.vendor_code}` : ""}
                  </p>
                </div>
                {selected.warehouse && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {SOURCE_LABELS[selected.warehouse.source] ?? selected.warehouse.source}
                  </span>
                )}
              </div>

              <WarehouseMapPicker
                value={point}
                onChange={onMapMoved}
                onAddressResolved={setAddress}
                disabled={saving}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Latitude
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={latText}
                    onChange={(e) => {
                      setLatText(e.target.value);
                      commitTypedCoordinates(e.target.value, lngText);
                    }}
                    placeholder="12.971600"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Longitude
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lngText}
                    onChange={(e) => {
                      setLngText(e.target.value);
                      commitTypedCoordinates(latText, e.target.value);
                    }}
                    placeholder="77.594600"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Address <span className="font-semibold normal-case text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Filled in automatically when you search or use My location"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Label <span className="font-semibold normal-case text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={label}
                    maxLength={100}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Main godown"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="min-h-[18px] text-[11px] font-semibold">
                  {saveError && <span className="text-rose-600">{saveError}</span>}
                  {!saveError && savedAt && (
                    <span className="text-emerald-600">Saved at {savedAt}.</span>
                  )}
                  {!saveError && !savedAt && !isValidPoint(point) && (
                    <span className="text-slate-400">Drag the map or type coordinates to continue.</span>
                  )}
                </div>
                <button
                  onClick={save}
                  disabled={!canSave}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-amber-400 transition-all hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {saving ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {selected.warehouse ? "Update warehouse pin" : "Save warehouse pin"}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
