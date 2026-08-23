"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/http";
import { customerApi } from "@/lib/customer-api";
import type {
  CustomerOrder,
  PlaceOrderPayload,
  SkuAttachment,
  SkuOption,
} from "@/lib/customer-types";

const HOURS_PER_BILLED_DAY = 8;

interface FormState {
  skuId: string;
  start: string;
  end: string;
  paymentMethod: "cod" | "juspay";
  siteAddress: string;
  siteLat: string;
  siteLng: string;
  pickupAddress: string;
  deliveryAddress: string;
  senderName: string;
  senderContact: string;
  receiverName: string;
  receiverContact: string;
  workType: string;
  typeOfLoad: string;
  soilType: string;
  purpose: string;
  dumpLocation: string;
  estimatedKm: string;
  notes: string;
  baseAmount: string;
  attachmentAmount: string;
  dieselSurcharge: string;
  tollCharges: string;
  discountAmount: string;
  couponCode: string;
  couponDiscount: string;
  extensionAmount: string;
  totalAmount: string;
}

interface AttachmentRow {
  key: string;
  name: string;
  quantity: string;
  unitPrice: string;
  skuAttachmentId: number | null;
}

const EMPTY: FormState = {
  skuId: "",
  start: "",
  end: "",
  paymentMethod: "juspay",
  siteAddress: "",
  siteLat: "",
  siteLng: "",
  pickupAddress: "",
  deliveryAddress: "",
  senderName: "",
  senderContact: "",
  receiverName: "",
  receiverContact: "",
  workType: "",
  typeOfLoad: "",
  soilType: "",
  purpose: "",
  dumpLocation: "",
  estimatedKm: "",
  notes: "",
  baseAmount: "",
  attachmentAmount: "",
  dieselSurcharge: "",
  tollCharges: "",
  discountAmount: "",
  couponCode: "",
  couponDiscount: "",
  extensionAmount: "",
  totalAmount: "",
};

function toIso(value: string): string {
  return new Date(value).toISOString();
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function PlaceOrderForm({
  onPlaced,
}: {
  onPlaced: (order: CustomerOrder) => void;
}) {
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [catalogue, setCatalogue] = useState<SkuAttachment[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [siteImages, setSiteImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customerApi
      .listSkus()
      .then(setSkus)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load machines"));
  }, []);

  const chooseSku = (value: string) => {
    set("skuId")(value);
    setAttachments([]);
    if (!value) {
      setCatalogue([]);
      return;
    }
    customerApi
      .listSkuAttachments(Number(value))
      .then(setCatalogue)
      .catch(() => setCatalogue([]));
  };

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const sku = useMemo(
    () => skus.find((s) => String(s.id) === form.skuId) ?? null,
    [skus, form.skuId]
  );

  const hours = useMemo(() => {
    if (!form.start || !form.end) return null;
    const ms = new Date(form.end).getTime() - new Date(form.start).getTime();
    if (Number.isNaN(ms) || ms <= 0) return null;
    return Math.round((ms / 3600000) * 100) / 100;
  }, [form.start, form.end]);

  const quote = useMemo(() => {
    if (!sku || hours === null) return null;
    if ((sku.price_unit ?? "").toLowerCase() === "per_day") {
      return sku.base_price * Math.ceil(hours / HOURS_PER_BILLED_DAY);
    }
    return sku.base_price * hours;
  }, [sku, hours]);

  const belowMinimum =
    sku?.min_booking_hours != null && hours !== null && hours < sku.min_booking_hours;

  const attachmentLines = useMemo(
    () =>
      attachments
        .filter((row) => row.name.trim())
        .map((row) => ({
          name: row.name.trim(),
          quantity: Math.max(1, Number(row.quantity) || 1),
          unit_price: Number(row.unitPrice) || 0,
          sku_attachment_id: row.skuAttachmentId,
        })),
    [attachments]
  );

  const attachmentTotal = useMemo(
    () => attachmentLines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0),
    [attachmentLines]
  );

  const amounts = useMemo(() => {
    const base = optionalNumber(form.baseAmount) ?? quote ?? 0;
    const attachment = optionalNumber(form.attachmentAmount) ?? attachmentTotal;
    const diesel = optionalNumber(form.dieselSurcharge) ?? 0;
    const toll = optionalNumber(form.tollCharges) ?? 0;
    const discount = optionalNumber(form.discountAmount) ?? 0;
    const coupon = optionalNumber(form.couponDiscount) ?? 0;
    const extension = optionalNumber(form.extensionAmount) ?? 0;
    const computed =
      Math.round((base + attachment + diesel + toll + extension - discount - coupon) * 100) / 100;
    const total = optionalNumber(form.totalAmount) ?? computed;
    return {
      base,
      attachment,
      diesel,
      toll,
      discount,
      coupon,
      extension,
      computed,
      total,
      adjustment: Math.round((total - computed) * 100) / 100,
    };
  }, [form, quote, attachmentTotal]);

  const addAttachment = (option?: SkuAttachment) =>
    setAttachments((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${prev.length}`,
        name: option?.name ?? "",
        quantity: "1",
        unitPrice: option ? String(option.price) : "",
        skuAttachmentId: option?.id ?? null,
      },
    ]);

  const updateAttachment = (key: string, patch: Partial<AttachmentRow>) =>
    setAttachments((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );

  const removeAttachment = (key: string) =>
    setAttachments((prev) => prev.filter((row) => row.key !== key));

  const uploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const urls = await Promise.all(
        Array.from(files).map((file) => customerApi.uploadSiteImage(file))
      );
      setSiteImages((prev) => [...prev, ...urls]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not upload the image");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload: PlaceOrderPayload = {
        sku_id: Number(form.skuId),
        scheduled_start: toIso(form.start),
        scheduled_end: toIso(form.end),
        payment_method: form.paymentMethod,
        site_address: optionalText(form.siteAddress),
        site_lat: optionalNumber(form.siteLat),
        site_lng: optionalNumber(form.siteLng),
        pickup_address: optionalText(form.pickupAddress),
        delivery_address: optionalText(form.deliveryAddress),
        sender_name: optionalText(form.senderName),
        sender_contact: optionalText(form.senderContact),
        receiver_name: optionalText(form.receiverName),
        receiver_contact: optionalText(form.receiverContact),
        work_type: optionalText(form.workType),
        type_of_load: optionalText(form.typeOfLoad),
        soil_type: optionalText(form.soilType),
        purpose: optionalText(form.purpose),
        dump_location_address: optionalText(form.dumpLocation),
        estimated_km: optionalNumber(form.estimatedKm),
        notes: optionalText(form.notes),
        attachments: attachmentLines,
        site_images: siteImages,
        base_amount: optionalNumber(form.baseAmount),
        attachment_amount: optionalNumber(form.attachmentAmount),
        diesel_surcharge: optionalNumber(form.dieselSurcharge) ?? 0,
        toll_charges: optionalNumber(form.tollCharges) ?? 0,
        discount_amount: optionalNumber(form.discountAmount) ?? 0,
        coupon_code: optionalText(form.couponCode),
        coupon_discount: optionalNumber(form.couponDiscount) ?? 0,
        extension_amount: optionalNumber(form.extensionAmount) ?? 0,
        total_amount: optionalNumber(form.totalAmount),
      };
      const order = await customerApi.placeOrder(payload);
      setForm({ ...EMPTY, paymentMethod: form.paymentMethod });
      setAttachments([]);
      setSiteImages([]);
      onPlaced(order);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not place the order");
    } finally {
      setBusy(false);
    }
  };

  const ready = Boolean(form.skuId && form.start && form.end) && hours !== null && !belowMinimum;

  return (
    <div className="space-y-6">
      <Section title="Machine & schedule">
        <Field label="Machine (rental SKU)">
          <select
            value={form.skuId}
            onChange={(e) => chooseSku(e.target.value)}
            className={CONTROL}
          >
            <option value="">Select a machine…</option>
            {skus.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} · {option.capacity} · ₹{option.base_price.toLocaleString()}{" "}
                {option.price_unit ?? ""}
                {option.vendor_ready ? "" : " (no vendor fleet)"}
              </option>
            ))}
          </select>
        </Field>

        {sku && (
          <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Minimum booking {sku.min_booking_hours ?? 0} hours · extension{" "}
            {sku.can_extend ? "allowed" : "not allowed"} ·{" "}
            {sku.vendor_ready
              ? "vendors with this machine exist, so the order will show up in their feed"
              : "no vendor currently owns this machine, the order will sit unclaimed"}
          </p>
        )}

        <Row>
          <Field label="Start">
            <input
              type="datetime-local"
              value={form.start}
              onChange={(e) => set("start")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="End">
            <input
              type="datetime-local"
              value={form.end}
              onChange={(e) => set("end")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="Duration">
            <p className="px-1 py-2 text-sm text-gray-900">
              {hours === null ? "—" : `${hours} hours`}
            </p>
          </Field>
        </Row>

        {belowMinimum && (
          <p className="text-xs font-medium text-red-600">
            Below the {sku?.min_booking_hours} hour minimum for this machine.
          </p>
        )}
      </Section>

      <Section title="Site & work details">
        <Field label="Site address">
          <input
            value={form.siteAddress}
            onChange={(e) => set("siteAddress")(e.target.value)}
            className={CONTROL}
          />
        </Field>
        <Row>
          <Field label="Site latitude">
            <input
              value={form.siteLat}
              onChange={(e) => set("siteLat")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="Site longitude">
            <input
              value={form.siteLng}
              onChange={(e) => set("siteLng")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="Estimated km">
            <input
              value={form.estimatedKm}
              onChange={(e) => set("estimatedKm")(e.target.value)}
              className={CONTROL}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Work type">
            <input
              value={form.workType}
              onChange={(e) => set("workType")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="Soil type">
            <input
              value={form.soilType}
              onChange={(e) => set("soilType")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="Type of load">
            <input
              value={form.typeOfLoad}
              onChange={(e) => set("typeOfLoad")(e.target.value)}
              className={CONTROL}
            />
          </Field>
        </Row>
        <Field label="Purpose">
          <input
            value={form.purpose}
            onChange={(e) => set("purpose")(e.target.value)}
            className={CONTROL}
          />
        </Field>
      </Section>

      <Section title="Pickup, drop & contacts">
        <Row>
          <Field label="Pickup address">
            <input
              value={form.pickupAddress}
              onChange={(e) => set("pickupAddress")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="Delivery address">
            <input
              value={form.deliveryAddress}
              onChange={(e) => set("deliveryAddress")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="Dump location">
            <input
              value={form.dumpLocation}
              onChange={(e) => set("dumpLocation")(e.target.value)}
              className={CONTROL}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Sender name">
            <input
              value={form.senderName}
              onChange={(e) => set("senderName")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="Sender contact">
            <input
              value={form.senderContact}
              onChange={(e) => set("senderContact")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="Notes">
            <input
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              className={CONTROL}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Receiver name">
            <input
              value={form.receiverName}
              onChange={(e) => set("receiverName")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="Receiver contact">
            <input
              value={form.receiverContact}
              onChange={(e) => set("receiverContact")(e.target.value)}
              className={CONTROL}
            />
          </Field>
        </Row>
      </Section>

      <Section title="Attachments">
        {catalogue.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {catalogue.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => addAttachment(option)}
                disabled={!option.is_available}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                + {option.name} (₹{option.price.toLocaleString()})
              </button>
            ))}
          </div>
        )}

        {attachments.length === 0 && (
          <p className="text-xs text-gray-500">
            No attachments added. {catalogue.length === 0 ? "This SKU has no catalogue attachments, add a custom line instead." : ""}
          </p>
        )}

        {attachments.map((row) => (
          <div key={row.key} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Name">
              <input
                value={row.name}
                onChange={(e) => updateAttachment(row.key, { name: e.target.value })}
                className={CONTROL}
              />
            </Field>
            <Field label="Quantity">
              <input
                value={row.quantity}
                onChange={(e) => updateAttachment(row.key, { quantity: e.target.value })}
                className={CONTROL}
              />
            </Field>
            <Field label="Unit price">
              <input
                value={row.unitPrice}
                onChange={(e) => updateAttachment(row.key, { unitPrice: e.target.value })}
                className={CONTROL}
              />
            </Field>
            <div className="flex items-end justify-between gap-2 pb-1">
              <span className="text-sm font-semibold text-gray-900">
                ₹{((Number(row.unitPrice) || 0) * (Number(row.quantity) || 0)).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(row.key)}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => addAttachment()}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Add custom attachment
        </button>
      </Section>

      <Section title="Site images">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => uploadImages(e.target.files)}
          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        <p className="text-xs text-gray-500">
          {uploading
            ? "Uploading…"
            : "Files are stored by the backend and the returned links are saved on the booking."}
        </p>
        {siteImages.length > 0 && (
          <ul className="space-y-2">
            {siteImages.map((url) => (
              <li key={url} className="flex items-center gap-3">
                <img src={url} alt="Site" className="h-10 w-10 rounded border border-gray-200 object-cover" />
                <span className="flex-1 truncate text-xs text-gray-600">{url}</span>
                <button
                  type="button"
                  onClick={() => setSiteImages((prev) => prev.filter((u) => u !== url))}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Payment & amounts">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <PaymentChoice
            active={form.paymentMethod === "juspay"}
            title="Juspay (test gateway)"
            blurb="Simulated online payment, captured instantly."
            onClick={() => set("paymentMethod")("juspay")}
          />
          <PaymentChoice
            active={form.paymentMethod === "cod"}
            title="Cash on delivery"
            blurb="Operator collects cash when the job ends."
            onClick={() => set("paymentMethod")("cod")}
          />
        </div>

        <Row>
          <Field label="Base amount (blank = SKU price)">
            <input
              value={form.baseAmount}
              onChange={(e) => set("baseAmount")(e.target.value)}
              placeholder={quote !== null ? String(quote) : "Auto"}
              className={CONTROL}
            />
          </Field>
          <Field label="Attachment amount (blank = sum of lines)">
            <input
              value={form.attachmentAmount}
              onChange={(e) => set("attachmentAmount")(e.target.value)}
              placeholder={String(attachmentTotal)}
              className={CONTROL}
            />
          </Field>
          <Field label="Diesel surcharge">
            <input
              value={form.dieselSurcharge}
              onChange={(e) => set("dieselSurcharge")(e.target.value)}
              placeholder="0"
              className={CONTROL}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Toll charges">
            <input
              value={form.tollCharges}
              onChange={(e) => set("tollCharges")(e.target.value)}
              placeholder="0"
              className={CONTROL}
            />
          </Field>
          <Field label="Discount amount">
            <input
              value={form.discountAmount}
              onChange={(e) => set("discountAmount")(e.target.value)}
              placeholder="0"
              className={CONTROL}
            />
          </Field>
          <Field label="Extension amount">
            <input
              value={form.extensionAmount}
              onChange={(e) => set("extensionAmount")(e.target.value)}
              placeholder="0"
              className={CONTROL}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Coupon code">
            <input
              value={form.couponCode}
              onChange={(e) => set("couponCode")(e.target.value)}
              className={CONTROL}
            />
          </Field>
          <Field label="Coupon discount">
            <input
              value={form.couponDiscount}
              onChange={(e) => set("couponDiscount")(e.target.value)}
              placeholder="0"
              className={CONTROL}
            />
          </Field>
          <Field label="Total amount (blank = computed)">
            <input
              value={form.totalAmount}
              onChange={(e) => set("totalAmount")(e.target.value)}
              placeholder={String(amounts.computed)}
              className={CONTROL}
            />
          </Field>
        </Row>

        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <BreakdownLine label="Machine hire" value={amounts.base} />
          <BreakdownLine label="Attachments" value={amounts.attachment} />
          <BreakdownLine label="Diesel surcharge" value={amounts.diesel} />
          <BreakdownLine label="Toll charges" value={amounts.toll} />
          <BreakdownLine label="Extension" value={amounts.extension} />
          <BreakdownLine label="Discount" value={-amounts.discount} />
          <BreakdownLine label="Coupon discount" value={-amounts.coupon} />
          <div className="mt-2 flex justify-between border-t border-gray-300 pt-2 font-bold text-gray-900">
            <span>Total charged</span>
            <span>₹{amounts.total.toLocaleString()}</span>
          </div>
          {amounts.adjustment !== 0 && (
            <p className="mt-2 text-xs text-amber-800">
              Total differs from the line sum by ₹{amounts.adjustment.toLocaleString()}. The
              settlement engine will book that gap as a &quot;Price adjustment&quot; earning line.
            </p>
          )}
        </div>
      </Section>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={busy || !ready}
        className="rounded-md bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {busy ? "Placing order…" : "Place order"}
      </button>
    </div>
  );
}

const CONTROL =
  "w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 " +
  "focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-bold text-gray-900">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-800">{label}</span>
      {children}
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{children}</div>;
}

function BreakdownLine({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-gray-700">
      <span>{label}</span>
      <span>₹{value.toLocaleString()}</span>
    </div>
  );
}

function PaymentChoice({
  active,
  title,
  blurb,
  onClick,
}: {
  active: boolean;
  title: string;
  blurb: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-4 py-3 text-left ${
        active ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:bg-gray-50"
      }`}
    >
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-600">{blurb}</p>
    </button>
  );
}
