"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { UserAddress, UserAddressInput } from "@/lib/customer-types";
import { customerApi } from "@/lib/customer-api";
import { INDIA_STATES, stateName } from "@/lib/india-states";
import { getCurrentPosition } from "@/lib/geolocation";

interface Props {
  addresses: UserAddress[];
  selectedAddressId?: string | null;
  onSelectAddress?: (id: string) => void;
  onAddressChange: () => void;
}

export default function DeliveryAddressManager({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddressChange,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locating, setLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const [form, setForm] = useState<UserAddressInput>({
    label: "Site Office",
    house_no: "",
    area_locality: "",
    landmark: "",
    full_address: "",
    pincode: "",
    state_code: "MH",
    lat: undefined,
    lng: undefined,
    is_default: false,
  });

  const openAddModal = () => {
    setEditingAddress(null);
    setForm({
      label: "Construction Site",
      house_no: "",
      area_locality: "",
      landmark: "",
      full_address: "",
      pincode: "",
      state_code: "MH",
      lat: undefined,
      lng: undefined,
      is_default: addresses.length === 0,
    });
    setError(null);
    setGpsAccuracy(null);
    setShowModal(true);
  };

  const openEditModal = (addr: UserAddress) => {
    setEditingAddress(addr);
    setForm({
      label: addr.label || "",
      house_no: addr.house_no || "",
      area_locality: addr.area_locality || "",
      landmark: addr.landmark || "",
      full_address: addr.full_address || "",
      pincode: addr.pincode || "",
      state_code: addr.state_code || "MH",
      lat: addr.lat != null ? Number(addr.lat) : undefined,
      lng: addr.lng != null ? Number(addr.lng) : undefined,
      is_default: addr.is_default,
    });
    setError(null);
    setGpsAccuracy(null);
    setShowModal(true);
  };

  const handleGetCurrentLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const fix = await getCurrentPosition();
      setForm((prev) => ({
        ...prev,
        lat: Number(fix.lat.toFixed(6)),
        lng: Number(fix.lng.toFixed(6)),
      }));
      setGpsAccuracy(fix.accuracyMeters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to retrieve your location.");
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (form.full_address.trim().length < 5) {
      setError("Full address is required (at least 5 characters).");
      return;
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      setError("PIN code must be 6 digits.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: UserAddressInput = {
        ...form,
        lat: form.lat !== undefined && form.lat !== null && !isNaN(Number(form.lat)) ? Number(form.lat) : undefined,
        lng: form.lng !== undefined && form.lng !== null && !isNaN(Number(form.lng)) ? Number(form.lng) : undefined,
      };
      if (editingAddress) {
        await customerApi.updateAddress(editingAddress.id, payload);
      } else {
        const created = await customerApi.createAddress(payload);
        if (onSelectAddress) {
          onSelectAddress(created.id);
        }
      }
      setShowModal(false);
      onAddressChange();
    } catch (err: any) {
      setError(err?.message || "Failed to save address");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      await customerApi.deleteAddress(id);
      onAddressChange();
    } catch (err: any) {
      alert(err?.message || "Failed to delete address");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await customerApi.setDefaultAddress(id);
      onAddressChange();
    } catch (err: any) {
      alert(err?.message || "Failed to set default address");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Delivery Address</h3>
          <p className="text-xs text-slate-500">Select where materials should be delivered</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors shadow-xs"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Address</span>
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-700">No delivery addresses found</p>
          <p className="mt-1 text-xs text-slate-500">Add an address to proceed with your order</p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Add Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {addresses.map((addr) => {
            const isSelected = selectedAddressId === addr.id;
            return (
              <div
                key={addr.id}
                onClick={() => onSelectAddress && onSelectAddress(addr.id)}
                className={`relative cursor-pointer rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-50/30 shadow-xs ring-1 ring-amber-500"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {addr.label || "Address"}
                    </span>
                    {addr.is_default && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                        Default
                      </span>
                    )}
                  </div>
                  {onSelectAddress && (
                    <input
                      type="radio"
                      name="delivery_address"
                      checked={isSelected}
                      onChange={() => onSelectAddress(addr.id)}
                      className="h-4 w-4 text-amber-500 focus:ring-amber-400"
                    />
                  )}
                </div>

                <p className="mt-2.5 text-xs text-slate-700 line-clamp-2 leading-relaxed">
                  {addr.full_address}
                </p>

                {(addr.landmark || addr.pincode || addr.state_code) && (
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {[
                      addr.landmark ? `Landmark: ${addr.landmark}` : null,
                      addr.pincode ? `PIN: ${addr.pincode}` : null,
                      stateName(addr.state_code) ?? addr.state_code ?? null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}

                {addr.lat != null && addr.lng != null && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 w-fit px-2 py-0.5 rounded-md border border-emerald-200">
                    <svg className="h-3 w-3 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span>GPS: {Number(addr.lat).toFixed(6)}, {Number(addr.lng).toFixed(6)}</span>
                  </div>
                )}

                <div className="mt-3.5 flex items-center gap-3 border-t border-slate-100 pt-2.5 text-[11px]">
                  {!addr.is_default && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(addr.id);
                      }}
                      className="font-semibold text-amber-700 hover:text-amber-800"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(addr);
                    }}
                    className="font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(addr.id);
                    }}
                    className="font-semibold text-rose-600 hover:text-rose-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingAddress ? "Edit Address" : "Add Delivery Address"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs font-semibold text-rose-800">
                {error}
              </div>
            )}

            <div
              className="mt-4 space-y-3"
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.target instanceof HTMLTextAreaElement) return;
                e.preventDefault();
                void handleSubmit();
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Label</label>
                  <input
                    type="text"
                    value={form.label || ""}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="e.g. Site Office, Plot 4"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Unit / Plot No.</label>
                  <input
                    type="text"
                    value={form.house_no || ""}
                    onChange={(e) => setForm({ ...form, house_no: e.target.value })}
                    placeholder="e.g. Plot 42 / Flat 301"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Locality / Sector</label>
                  <input
                    type="text"
                    value={form.area_locality || ""}
                    onChange={(e) => setForm({ ...form, area_locality: e.target.value })}
                    placeholder="e.g. Hinjawadi Phase 2"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">Landmark</label>
                  <input
                    type="text"
                    value={form.landmark || ""}
                    onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                    placeholder="e.g. Near Metro Station"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700">
                  Full Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={form.full_address}
                  onChange={(e) => setForm({ ...form, full_address: e.target.value })}
                  placeholder="Complete street address, building name, road name..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <span className="block text-[11px] font-bold text-slate-800">
                  GPS Coordinates (for 6km Warehouse Proximity)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={form.lat ?? ""}
                      onChange={(e) => setForm({ ...form, lat: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="e.g. 18.520430"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={form.lng ?? ""}
                      onChange={(e) => setForm({ ...form, lng: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="e.g. 73.856744"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleGetCurrentLocation()}
                  disabled={locating}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-100 px-3 py-2 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-200/80 hover:text-amber-900 disabled:opacity-50"
                >
                  <svg className={`h-3.5 w-3.5 ${locating ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {locating ? "Locating…" : "Use my current location"}
                </button>

                {gpsAccuracy !== null && (
                  <p className="text-[11px] font-semibold text-emerald-700">
                    Pinned from your device · accurate to about {gpsAccuracy} m
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">PIN Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pincode || ""}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    placeholder="e.g. 411057"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700">State</label>
                  <select
                    value={form.state_code ?? ""}
                    onChange={(e) => setForm({ ...form, state_code: e.target.value || undefined })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value="">Select a state…</option>
                    {INDIA_STATES.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name} ({state.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_default_addr"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="h-4 w-4 rounded-sm text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="is_default_addr" className="text-xs font-medium text-slate-700">
                  Set as default address
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 shadow-xs"
                >
                  {submitting ? "Saving…" : editingAddress ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
