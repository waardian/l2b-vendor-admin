"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, deliveryApi } from "@/lib/api";
import type {
  DeliveryCharge,
  DeliveryQuotePreview,
  DeliveryRateCard,
  DeliveryRateCardWrite,
  DeliveryVehicleType,
  DeliveryVehicleTypeWrite,
  DistanceSlab,
  RentalSkuOption,
} from "@/lib/types";
import {
  Banner,
  Choice,
  Field,
  FormSection,
  Preview,
  Row,
  StatusPill,
  TextInput,
  Toggle,
} from "@/components/FormKit";

const CALC_METHODS = ["flat", "per_km", "slab_km", "per_kg", "percent_of_order"];
const ROUND_MODES = ["half_up", "half_even", "floor", "ceiling"];

const METERED = new Set(["per_km", "per_kg", "slab_km"]);

function blankCard(): DeliveryRateCardWrite {
  return {
    code: "",
    name: "",
    vehicle_type_code: null,
    rental_sku_id: null,
    min_total: null,
    max_total: null,
    round_mode: "half_up",
    round_to: 1,
    currency: "INR",
    priority: 100,
    conditions: {},
    charges: [],
  };
}

function blankVehicle(): DeliveryVehicleTypeWrite & { code: string } {
  return {
    code: "",
    name: "",
    capacity_label: "",
    max_payload_kg: null,
    icon_key: "",
    length_label: "",
    height_label: "",
    display_order: null,
    is_active: true,
  };
}

function blankCharge(order: number): DeliveryCharge {
  return {
    code: order === 1 ? "DELIVERY_BASE_FARE" : "DELIVERY_DISTANCE",
    label: order === 1 ? "Pickup fee" : "Distance",
    calc_method: order === 1 ? "flat" : "per_km",
    component_order: order,
    rate_value: null,
    slabs: [],
    free_units: 0,
    min_amount: null,
    max_amount: null,
    conditions: {},
    is_active: true,
  };
}

function iconLabel(key: string): string {
  const trimmed = key.replace(/^ic_material_vehicle_/, "").replace(/_/g, " ");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function describeCharge(charge: DeliveryCharge): string {
  const rate = charge.rate_value ?? 0;
  const free = charge.free_units ?? 0;
  switch (charge.calc_method) {
    case "flat":
      return `₹${rate} flat`;
    case "per_km":
      return free > 0 ? `₹${rate}/km after the first ${free} km` : `₹${rate}/km`;
    case "per_kg":
      return free > 0 ? `₹${rate}/kg after the first ${free} kg` : `₹${rate}/kg`;
    case "percent_of_order":
      return `${rate}% of the order`;
    case "slab_km":
      return charge.slabs.length
        ? charge.slabs
            .map((s) => `${s.from_km}–${s.to_km ?? "∞"} km @ ₹${s.rate_per_km}`)
            .join(", ")
        : "banded — no bands set";
    default:
      return charge.calc_method;
  }
}

export default function DeliveryChargesPage() {
  const [cards, setCards] = useState<DeliveryRateCard[]>([]);
  const [vehicles, setVehicles] = useState<DeliveryVehicleType[]>([]);
  const [icons, setIcons] = useState<string[]>([]);
  const [vehicleDraft, setVehicleDraft] = useState(blankVehicle());
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [showFleetForm, setShowFleetForm] = useState(false);
  const [skus, setSkus] = useState<RentalSkuOption[]>([]);
  const [editingCard, setEditingCard] = useState<DeliveryRateCard | null>(null);
  const [draft, setDraft] = useState<DeliveryRateCardWrite>(blankCard());
  const [charges, setCharges] = useState<DeliveryCharge[]>([blankCharge(1), blankCharge(2)]);
  const [preview, setPreview] = useState<DeliveryQuotePreview | null>(null);
  const [previewKm, setPreviewKm] = useState("12");
  const [previewValue, setPreviewValue] = useState("10000");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      const [list, fleet, art, rentalSkus] = await Promise.all([
        deliveryApi.list(),
        deliveryApi.vehicleTypes(true),
        deliveryApi.vehicleIcons().catch(() => [] as string[]),
        deliveryApi.rentalSkus().catch(() => [] as RentalSkuOption[]),
      ]);
      setCards(list);
      setVehicles(fleet);
      setIcons(art);
      setSkus(rentalSkus);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load delivery charges");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setEditingCard(null);
    setDraft(blankCard());
    setCharges([blankCharge(1), blankCharge(2)]);
    setPreview(null);
  };

  const startEdit = (card: DeliveryRateCard) => {
    setEditingCard(card);
    setDraft({
      code: card.code,
      name: card.name,
      vehicle_type_code: card.vehicle_type_code,
      rental_sku_id: card.rental_sku_id,
      min_total: card.min_total,
      max_total: card.max_total,
      round_mode: card.round_mode,
      round_to: card.round_to,
      currency: card.currency,
      priority: card.priority,
      conditions: card.conditions || {},
      charges: card.charges || [],
    });
    setCharges(
      card.charges && card.charges.length > 0
        ? card.charges.map((c) => ({ ...c }))
        : [blankCharge(1), blankCharge(2)]
    );
    const el = document.getElementById("rate-card-editor");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(message);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = () => {
    const payload = {
      ...draft,
      charges: charges.map((c, i) => ({ ...c, component_order: i + 1 })),
    };
    if (editingCard && editingCard.status === "draft") {
      return run(async () => {
        await deliveryApi.updateDraft(editingCard.id, payload);
        reset();
      }, "Draft rate card updated");
    }
    return run(async () => {
      await deliveryApi.createDraft(payload);
      reset();
    }, editingCard ? `New version created as draft for ${editingCard.code}` : "Draft rate card created");
  };

  const runPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await deliveryApi.preview({
        vehicle_type_code: draft.vehicle_type_code ?? vehicles[0]?.code ?? "",
        rental_sku_id: draft.rental_sku_id ?? undefined,
        distance_km: Number(previewKm) || 0,
        order_value: Number(previewValue) || 0,
        weight_kg: 0,
      });
      setPreview(result);
    } catch (e) {
      setPreview(null);
      setError(e instanceof ApiError ? e.message : "Nothing live prices that vehicle yet");
    } finally {
      setBusy(false);
    }
  };

  const updateCharge = (index: number, patch: Partial<DeliveryCharge>) =>
    setCharges(charges.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const resetVehicleForm = () => {
    setVehicleDraft(blankVehicle());
    setEditingVehicle(null);
    setShowFleetForm(false);
  };

  const startEditVehicle = (vehicle: DeliveryVehicleType) => {
    setVehicleDraft({
      code: vehicle.code,
      name: vehicle.name,
      capacity_label: vehicle.capacity_label ?? "",
      max_payload_kg: vehicle.max_payload_kg,
      icon_key: vehicle.icon_key ?? "",
      length_label: vehicle.length_label ?? "",
      height_label: vehicle.height_label ?? "",
      display_order: vehicle.display_order,
      is_active: vehicle.is_active,
    });
    setEditingVehicle(vehicle.code);
    setShowFleetForm(true);
  };

  const saveVehicle = () => {
    const { code, ...rest } = vehicleDraft;
    const body: DeliveryVehicleTypeWrite = {
      ...rest,
      max_payload_kg:
        rest.max_payload_kg === null || rest.max_payload_kg === undefined
          ? null
          : Number(rest.max_payload_kg),
    };
    if (editingVehicle) {
      return run(async () => {
        await deliveryApi.updateVehicle(editingVehicle, body);
        resetVehicleForm();
      }, `${body.name} updated — both apps pick it up on their next load`);
    }
    return run(async () => {
      await deliveryApi.createVehicle({ ...body, code: code.trim().toUpperCase() });
      resetVehicleForm();
    }, `${body.name} added to the picker`);
  };

  const moveVehicle = (index: number, delta: number) => {
    const next = [...vehicles];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    return run(
      () => deliveryApi.resequenceVehicles(next.map((v) => v.code)),
      "Picker order updated"
    );
  };

  const vehicleLabel = (code: string | null) =>
    code ? vehicles.find((v) => v.code === code)?.name ?? code : "Any vehicle (fallback)";

  const formula = useMemo(() => {
    const parts = charges.filter((c) => c.is_active).map(describeCharge);
    const floor = draft.min_total ? `, minimum ₹${draft.min_total}` : "";
    return parts.length ? `${parts.join(" + ")}${floor}` : "No charges yet";
  }, [charges, draft.min_total]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Delivery Charges Engine
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Per-vehicle rate cards: a flat pickup fee, a per-kilometre rate, and a minimum.
          </p>
        </div>
      </header>

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Delivery Fleet ({vehicles.filter((v) => v.is_active).length} live)
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              The vehicles the vendor apps offer, in the order they are shown.
            </p>
          </div>
          <button
            onClick={() => {
              if (showFleetForm && !editingVehicle) return resetVehicleForm();
              setVehicleDraft(blankVehicle());
              setEditingVehicle(null);
              setShowFleetForm(true);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
          >
            {showFleetForm && !editingVehicle ? "Cancel" : "+ Add Vehicle"}
          </button>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th className="text-left">Order</th>
              <th className="text-left">Vehicle</th>
              <th className="text-left">Capacity</th>
              <th className="text-center">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm font-medium text-slate-400">
                  No vehicles configured. The picker in both apps will be empty.
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle, index) => (
                <tr key={vehicle.code} className="transition-colors hover:bg-slate-50/80">
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {vehicle.display_order}
                      </span>
                      <div className="flex flex-col">
                        <button
                          disabled={busy || index === 0}
                          onClick={() => moveVehicle(index, -1)}
                          className="text-[10px] leading-none text-slate-400 hover:text-slate-800 disabled:opacity-25"
                          aria-label={`Move ${vehicle.name} up`}
                        >
                          ▲
                        </button>
                        <button
                          disabled={busy || index === vehicles.length - 1}
                          onClick={() => moveVehicle(index, 1)}
                          className="text-[10px] leading-none text-slate-400 hover:text-slate-800 disabled:opacity-25"
                          aria-label={`Move ${vehicle.name} down`}
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      {vehicle.icon_key ? (
                        <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[9px] font-bold uppercase text-slate-500">
                          Art
                        </span>
                      ) : vehicle.image_url ? (
                        <img
                          src={vehicle.image_url}
                          alt=""
                          className="h-8 w-10 shrink-0 rounded-lg border border-slate-200 bg-white object-contain"
                        />
                      ) : (
                        <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[9px] font-bold uppercase text-slate-400">
                          None
                        </span>
                      )}
                      <div>
                        <p className="font-bold text-slate-900">{vehicle.name}</p>
                        <p className="font-mono text-xs font-semibold text-slate-500">
                          {vehicle.code}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs font-semibold text-slate-700">
                    {vehicle.capacity_label || "—"}
                    {vehicle.max_payload_kg ? (
                      <span className="ml-1 font-mono text-slate-400">
                        ({vehicle.max_payload_kg} kg max)
                      </span>
                    ) : null}
                  </td>
                  <td className="text-center">
                    <StatusPill status={vehicle.is_active ? "active" : "archived"} />
                    {vehicle.is_active && !vehicle.has_rate_card && (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        No rate card
                      </p>
                    )}
                  </td>
                  <td className="space-x-3 text-right">
                    <button
                      onClick={() => startEditVehicle(vehicle)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            deliveryApi.updateVehicle(vehicle.code, {
                              name: vehicle.name,
                              capacity_label: vehicle.capacity_label,
                              max_payload_kg: vehicle.max_payload_kg,
                              icon_key: vehicle.icon_key,
                              length_label: vehicle.length_label,
                              height_label: vehicle.height_label,
                              display_order: vehicle.display_order,
                              is_active: !vehicle.is_active,
                            }),
                          vehicle.is_active
                            ? `${vehicle.name} retired from the picker`
                            : `${vehicle.name} back in the picker`
                        )
                      }
                      className="text-xs font-bold text-slate-600 hover:underline"
                    >
                      {vehicle.is_active ? "Retire" : "Restore"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {showFleetForm && (
          <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-6">
            <h3 className="text-sm font-bold text-slate-900">
              {editingVehicle ? `Edit ${editingVehicle}` : "Add A Vehicle"}
            </h3>
            <Row>
              <Field label="Vehicle Name">
                <TextInput
                  value={vehicleDraft.name}
                  onChange={(v) => setVehicleDraft({ ...vehicleDraft, name: v })}
                  placeholder="Tempo 407"
                />
              </Field>
              <Field
                label="Vehicle Code"
                hint={editingVehicle ? "Fixed: rate cards refer to it" : "Uppercase identifier"}
              >
                <TextInput
                  value={vehicleDraft.code}
                  onChange={(v) =>
                    setVehicleDraft({ ...vehicleDraft, code: v.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })
                  }
                  placeholder="TEMPO_407"
                  disabled={Boolean(editingVehicle)}
                />
              </Field>
              <Field
                label="Illustration"
                hint={
                  vehicleDraft.icon_key
                    ? "Only art both apps already ship"
                    : "Left empty, the apps draw the rate card's machine photo"
                }
              >
                <Choice
                  value={vehicleDraft.icon_key ?? ""}
                  options={["", ...icons]}
                  labels={["No illustration", ...icons.map(iconLabel)]}
                  onChange={(v) => setVehicleDraft({ ...vehicleDraft, icon_key: v || null })}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Capacity Caption" hint="Shown under the name">
                <TextInput
                  value={vehicleDraft.capacity_label ?? ""}
                  onChange={(v) => setVehicleDraft({ ...vehicleDraft, capacity_label: v })}
                  placeholder="2.5 Tons (2,500 Kg)"
                />
              </Field>
              <Field label="Max Payload (kg)" hint="Filters the picker. Empty = no limit">
                <TextInput
                  type="number"
                  value={vehicleDraft.max_payload_kg?.toString() ?? ""}
                  onChange={(v) =>
                    setVehicleDraft({
                      ...vehicleDraft,
                      max_payload_kg: v === "" ? null : Number(v),
                    })
                  }
                  placeholder="2500"
                />
              </Field>
            </Row>
            <Row>
              <Field label="Load Bed Length" hint="Drawn beside the art. Display only">
                <TextInput
                  value={vehicleDraft.length_label ?? ""}
                  onChange={(v) => setVehicleDraft({ ...vehicleDraft, length_label: v })}
                  placeholder="19 FT"
                />
              </Field>
              <Field label="Load Bed Height" hint="Drawn beside the art. Display only">
                <TextInput
                  value={vehicleDraft.height_label ?? ""}
                  onChange={(v) => setVehicleDraft({ ...vehicleDraft, height_label: v })}
                  placeholder="7"
                />
              </Field>
            </Row>
            <Toggle
              label="Offer this vehicle in the apps"
              hint="Retiring it takes it out of the picker without touching the orders it has already carried."
              checked={vehicleDraft.is_active}
              onChange={(v) => setVehicleDraft({ ...vehicleDraft, is_active: v })}
            />
            <div className="flex flex-wrap gap-3">
              <button
                disabled={busy || !vehicleDraft.name.trim() || (!editingVehicle && !vehicleDraft.code.trim())}
                onClick={saveVehicle}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-sm transition-all hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
              >
                {editingVehicle ? "Save Vehicle" : "Add To Picker"}
              </button>
              <button
                onClick={resetVehicleForm}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 transition-all hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Configured Rate Cards ({cards.length})
          </h2>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th className="text-left">Card &amp; Vehicle</th>
              <th className="text-left">Charge Formula</th>
              <th className="text-center">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cards.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm font-medium text-slate-400">
                  No rate cards yet. A vehicle with no card cannot be quoted at all.
                </td>
              </tr>
            ) : (
              cards.map((card) => (
                <tr key={card.id} className="transition-colors hover:bg-slate-50/80">
                  <td>
                    <p className="font-bold text-slate-900">{card.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="font-mono text-xs font-semibold text-slate-500">
                        {card.code} · v{card.version} · {vehicleLabel(card.vehicle_type_code)}
                      </span>
                      {card.rental_sku_name ? (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                          {card.rental_sku_name}
                        </span>
                      ) : card.rental_sku_id ? (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                          Machine SKU #{card.rental_sku_id}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="font-mono text-xs font-semibold text-slate-700">
                    {card.charges.map(describeCharge).join(" + ") || "—"}
                    {card.min_total ? `, min ₹${card.min_total}` : ""}
                  </td>
                  <td className="text-center">
                    <StatusPill status={card.status} />
                  </td>
                  <td className="space-x-3 text-right">
                    <button
                      onClick={() => startEdit(card)}
                      className="text-xs font-bold text-slate-700 hover:text-amber-600 hover:underline"
                    >
                      Edit
                    </button>
                    {card.status === "draft" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(() => deliveryApi.setStatus(card.id, "active"), `${card.name} is live`)
                        }
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        Make Live
                      </button>
                    )}
                    {card.status === "active" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(() => deliveryApi.setStatus(card.id, "paused"), `${card.name} paused`)
                        }
                        className="text-xs font-bold text-amber-800 hover:underline"
                      >
                        Pause
                      </button>
                    )}
                    {card.status === "paused" && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => deliveryApi.setStatus(card.id, "archived"),
                            `${card.name} archived`
                          )
                        }
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section id="rate-card-editor" className="space-y-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">
                {editingCard
                  ? editingCard.status === "draft"
                    ? `Editing Draft: ${editingCard.name}`
                    : `Edit & Create Next Version for ${editingCard.code}`
                  : "New Rate Card"}
              </h2>
              {editingCard && (
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    editingCard.status === "draft"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {editingCard.status === "draft"
                    ? `Draft v${editingCard.version}`
                    : `v${editingCard.version} → v${editingCard.version + 1}`}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 pt-0.5">
              {editingCard
                ? editingCard.status === "draft"
                  ? "Modifying this unreleased draft directly. Once made live, it will freeze into history."
                  : `Modifying an active card will publish a new draft revision (v${editingCard.version + 1}) preserving previous version quotes.`
                : "Saved as a draft. A live card is never edited — posting the same code again creates the next version."}
            </p>
          </div>
          <button
            onClick={reset}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
          >
            {editingCard ? "Cancel Editing" : "Reset Form"}
          </button>
        </div>

        <FormSection step={1} title="Vehicle & Machine SKU" blurb="Configure which vehicle and/or rental machine SKU this card applies to">
          <Row>
            <Field label="Card Name">
              <TextInput
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
                placeholder="JCB 3DX Transport / Tata Ace City"
              />
            </Field>
            <Field label="Card Code" hint="Uppercase; reused to version this card">
              <TextInput
                value={draft.code}
                onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })}
                placeholder="JCB_3DX_TRANSPORT"
              />
            </Field>
          </Row>
          <Row>
            <Field
              label="Vehicle"
              hint="Leave as fallback if pricing by machine SKU or generic"
            >
              <Choice
                value={draft.vehicle_type_code ?? ""}
                options={["", ...vehicles.map((v) => v.code)]}
                labels={["Any vehicle (fallback)", ...vehicles.map((v) => v.name)]}
                onChange={(v) => setDraft({ ...draft, vehicle_type_code: v || null })}
              />
            </Field>
            <Field
              label="Linked Rental Machine SKU"
              hint="Link this delivery rate card to a specific machine model"
            >
              <Choice
                value={draft.rental_sku_id ? String(draft.rental_sku_id) : ""}
                options={["", ...skus.map((s) => String(s.id))]}
                labels={[
                  "None / Not machine specific",
                  ...skus.map(
                    (s) =>
                      `${s.name}${s.capacity ? ` (${s.capacity})` : ""}${
                        s.sub_category_name ? ` • ${s.sub_category_name}` : ""
                      }`
                  ),
                ]}
                onChange={(v) => setDraft({ ...draft, rental_sku_id: v ? Number(v) : null })}
              />
            </Field>
          </Row>
        </FormSection>

        <FormSection step={2} title="Charges" blurb="Added together in this order">
          <div className="space-y-4">
            {charges.map((charge, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">Charge {index + 1}</p>
                  {charges.length > 1 && (
                    <button
                      onClick={() => setCharges(charges.filter((_, i) => i !== index))}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <Row>
                  <Field label="Label (shown to the vendor)">
                    <TextInput
                      value={charge.label}
                      onChange={(v) => updateCharge(index, { label: v })}
                      placeholder="Pickup fee"
                    />
                  </Field>
                  <Field label="Code">
                    <TextInput
                      value={charge.code}
                      onChange={(v) => updateCharge(index, { code: v.toUpperCase() })}
                    />
                  </Field>
                </Row>
                <Row>
                  <Field label="How it is worked out">
                    <Choice
                      value={charge.calc_method}
                      options={CALC_METHODS}
                      onChange={(v) => updateCharge(index, { calc_method: v })}
                    />
                  </Field>
                  {charge.calc_method !== "slab_km" && (
                    <Field
                      label={
                        charge.calc_method === "percent_of_order"
                          ? "Percentage (%)"
                          : charge.calc_method === "flat"
                            ? "Amount (₹)"
                            : `Rate per ${charge.calc_method === "per_kg" ? "kg" : "km"} (₹)`
                      }
                    >
                      <TextInput
                        value={charge.rate_value?.toString() ?? ""}
                        onChange={(v) =>
                          updateCharge(index, { rate_value: v === "" ? null : Number(v) })
                        }
                        placeholder="50"
                      />
                    </Field>
                  )}
                </Row>
                {METERED.has(charge.calc_method) && charge.calc_method !== "slab_km" && (
                  <Field
                    label="Included before the meter starts"
                    hint="e.g. 3 — the first 3 km are free"
                  >
                    <TextInput
                      value={charge.free_units?.toString() ?? "0"}
                      onChange={(v) => updateCharge(index, { free_units: Number(v) || 0 })}
                    />
                  </Field>
                )}
                {charge.calc_method === "slab_km" && (
                  <SlabEditor
                    slabs={charge.slabs}
                    onChange={(slabs) => updateCharge(index, { slabs })}
                  />
                )}
              </div>
            ))}
            <button
              onClick={() => setCharges([...charges, blankCharge(charges.length + 1)])}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              + Add charge
            </button>
          </div>
        </FormSection>

        <FormSection
          step={3}
          title="Floor, ceiling and rounding"
          blurb="Applied to the total after the charges are added up"
        >
          <Row>
            <Field label="Minimum total (₹)" hint="The per-vehicle minimum">
              <TextInput
                value={draft.min_total?.toString() ?? ""}
                onChange={(v) => setDraft({ ...draft, min_total: v === "" ? null : Number(v) })}
                placeholder="300"
              />
            </Field>
            <Field label="Maximum total (₹)" hint="Optional cap">
              <TextInput
                value={draft.max_total?.toString() ?? ""}
                onChange={(v) => setDraft({ ...draft, max_total: v === "" ? null : Number(v) })}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Round the total to (₹)" hint="₹1 keeps paise off a delivery fee">
              <TextInput
                value={draft.round_to?.toString() ?? "1"}
                onChange={(v) => setDraft({ ...draft, round_to: Number(v) || 1 })}
              />
            </Field>
            <Field label="Rounding mode">
              <Choice
                value={draft.round_mode}
                options={ROUND_MODES}
                onChange={(v) => setDraft({ ...draft, round_mode: v })}
              />
            </Field>
          </Row>
          <Preview>
            <span className="font-semibold">This card reads: </span>
            {formula}
          </Preview>
        </FormSection>

        <FormSection
          step={4}
          title="Try it before it goes live"
          blurb="Runs the same engine the apps hit, against the cards that are already active"
        >
          <Row>
            <Field label="Distance (km)">
              <TextInput value={previewKm} onChange={setPreviewKm} />
            </Field>
            <Field label="Order value (₹)">
              <TextInput value={previewValue} onChange={setPreviewValue} />
            </Field>
          </Row>
          <button
            disabled={busy}
            onClick={runPreview}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Run dry run
          </button>
          {preview && (
            <Preview>
              <ul className="space-y-1">
                {preview.components.map((c) => (
                  <li key={c.code} className="flex justify-between">
                    <span>
                      {c.label}
                      {c.units != null && c.rate_value != null
                        ? ` — ${c.units} × ₹${c.rate_value}`
                        : ""}
                    </span>
                    <span className="font-semibold">₹{c.amount}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                  <span>Total{preview.min_total_applied ? " (minimum applied)" : ""}</span>
                  <span>₹{preview.total}</span>
                </li>
              </ul>
            </Preview>
          )}
        </FormSection>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            disabled={busy || !draft.code || !draft.name}
            onClick={saveDraft}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-amber-600 disabled:opacity-50"
          >
            {editingCard
              ? editingCard.status === "draft"
                ? "Update Draft"
                : `Save as Version ${editingCard.version + 1}`
              : "Save Draft"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SlabEditor({
  slabs,
  onChange,
}: {
  slabs: DistanceSlab[];
  onChange: (slabs: DistanceSlab[]) => void;
}) {
  const update = (index: number, patch: Partial<DistanceSlab>) =>
    onChange(slabs.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-700">
        Distance bands — each band prices only its own kilometres, so the bill never jumps
      </p>
      {slabs.map((slab, index) => (
        <div key={index} className="flex items-end gap-2">
          <Field label="From (km)">
            <TextInput
              value={slab.from_km?.toString() ?? "0"}
              onChange={(v) => update(index, { from_km: Number(v) || 0 })}
            />
          </Field>
          <Field label="To (km)" hint="Blank = onwards">
            <TextInput
              value={slab.to_km?.toString() ?? ""}
              onChange={(v) => update(index, { to_km: v === "" ? null : Number(v) })}
            />
          </Field>
          <Field label="₹ per km">
            <TextInput
              value={slab.rate_per_km?.toString() ?? "0"}
              onChange={(v) => update(index, { rate_per_km: Number(v) || 0 })}
            />
          </Field>
          <button
            onClick={() => onChange(slabs.filter((_, i) => i !== index))}
            className="mb-2 text-xs font-bold text-rose-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange([
            ...slabs,
            {
              from_km: slabs.length ? slabs[slabs.length - 1].to_km ?? 0 : 0,
              to_km: null,
              rate_per_km: 0,
            },
          ])
        }
        className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
      >
        + Add band
      </button>
    </div>
  );
}
