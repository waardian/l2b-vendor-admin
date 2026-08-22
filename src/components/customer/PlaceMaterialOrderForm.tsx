"use client";

import { useEffect, useState } from "react";
import {
  DeliveryMode,
  MaterialCategory,
  MaterialOrder,
  MaterialOrderQuote,
  MaterialProduct,
  MaterialProductVariant,
  UserAddress,
} from "@/lib/customer-types";
import { customerApi } from "@/lib/customer-api";
import DeliveryAddressManager from "./DeliveryAddressManager";

interface CartItem {
  id: string;
  product: MaterialProduct;
  variant: MaterialProductVariant;
  brand_id?: string;
  brand_name?: string;
  unit_price: number;
  qty: number;
  line_total: number;
}

interface Props {
  addresses: UserAddress[];
  onAddressChange: () => void;
  onPlaced: (order: MaterialOrder) => void;
}

export default function PlaceMaterialOrderForm({
  addresses,
  onAddressChange,
  onPlaced,
}: Props) {
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | null>(null);
  const [products, setProducts] = useState<MaterialProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<MaterialProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MaterialProductVariant | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedBrandName, setSelectedBrandName] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<number>(100);
  const [qty, setQty] = useState<number>(10);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    addresses.find((a) => a.is_default)?.id || addresses[0]?.id || null
  );

  const [deliveryModes, setDeliveryModes] = useState<DeliveryMode[]>([
    {
      mode: "fast_delivery",
      label: "Fast Delivery",
      surcharge_amount: "100.00",
      eta_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    },
    {
      mode: "normal",
      label: "Normal Delivery",
      surcharge_amount: "0.00",
      eta_date: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
    },
    {
      mode: "scheduled",
      label: "Schedule Delivery",
      surcharge_amount: "0.00",
      eta_date: null,
    },
  ]);
  const [selectedMode, setSelectedMode] = useState<string>("fast_delivery");
  const [quote, setQuote] = useState<MaterialOrderQuote | null>(null);
  // Same default as the rental checkout, and the same one the settlement engine
  // assumed for every materials order before this field existed.
  const [paymentMode, setPaymentMode] = useState<"online" | "cod">("online");
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10)
  );

  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.is_default) || addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    customerApi
      .getDeliveryModes()
      .then((modes) => {
        if (modes && modes.length > 0) {
          setDeliveryModes(modes);
          setSelectedMode(modes[0].mode);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    customerApi
      .listMaterialCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCategory(cats[0]);
        }
      })
      .catch((e) => setError(e?.message || "Failed to load categories"))
      .finally(() => setLoadingCatalog(false));
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    setLoadingProducts(true);
    customerApi
      .listMaterialProducts(selectedCategory.id)
      .then((prods) => {
        setProducts(prods);
        if (prods.length > 0) {
          setSelectedProduct(prods[0]);
        } else {
          setSelectedProduct(null);
          setSelectedVariant(null);
        }
      })
      .catch((e) => setError(e?.message || "Failed to load products"))
      .finally(() => setLoadingProducts(false));
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedVariant(null);
      return;
    }
    const firstVar = selectedProduct.variants[0] || null;
    setSelectedVariant(firstVar);
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedVariant) return;
    if (selectedVariant.brands && selectedVariant.brands.length > 0) {
      const b = selectedVariant.brands[0];
      setSelectedBrandId(b.brand_id);
      setSelectedBrandName(b.brand_name);
      setUnitPrice(b.unit_price);
    } else {
      setSelectedBrandId("");
      setSelectedBrandName("Standard / Generic");
      setUnitPrice(100);
    }
  }, [selectedVariant]);

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    const b = selectedVariant?.brands.find((x) => x.brand_id === brandId);
    if (b) {
      setSelectedBrandName(b.brand_name);
      setUnitPrice(b.unit_price);
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedVariant) return;
    const lineTotal = unitPrice * qty;
    const newItem: CartItem = {
      id: `${selectedVariant.id}-${selectedBrandId}-${Date.now()}`,
      product: selectedProduct,
      variant: selectedVariant,
      brand_id: selectedBrandId || undefined,
      brand_name: selectedBrandName,
      unit_price: unitPrice,
      qty,
      line_total: lineTotal,
    };
    setCart((prev) => [...prev, newItem]);
    setError(null);
  };

  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const currentModeObj = deliveryModes.find((m) => m.mode === selectedMode);
  const surcharge = currentModeObj ? parseFloat(currentModeObj.surcharge_amount || "0") : 0;

  // The bill comes from the server, which runs the same code that will charge
  // it. This used to be worked out here — a flat 18% on every line and a
  // free-delivery threshold of its own — so the customer agreed to one total
  // and was billed another. Tax follows the commodity: cement 18%, clay brick
  // 12%, aggregate 5%.
  const subtotal = cart.reduce((acc, i) => acc + i.line_total, 0);
  const taxTotal = quote?.tax_total ?? 0;
  const shippingTotal = quote?.shipping_total ?? 0;
  const grandTotal = quote?.grand_total ?? subtotal + surcharge;
  const quotedSubtotal = quote?.subtotal ?? subtotal;
  const quoting = quote === null && cart.length > 0;

  useEffect(() => {
    if (cart.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    customerApi
      .quoteMaterialOrder({
        delivery_mode: selectedMode,
        items: cart.map((i) => ({
          variant_id: i.variant.id,
          brand_id: i.brand_id,
          qty: i.qty,
        })),
      })
      .then((result) => {
        if (!cancelled) setQuote(result);
      })
      .catch(() => {
        // A quote that will not load must not block checkout; the order is
        // priced server-side either way when it is placed.
        if (!cancelled) setQuote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [cart, selectedMode]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddressId) {
      setError("Please select or add a delivery address.");
      return;
    }
    if (cart.length === 0) {
      setError("Please add at least one material item to the order.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payloadDate =
        selectedMode === "scheduled"
          ? scheduledDate
          : currentModeObj?.eta_date || undefined;

      const payload = {
        delivery_address_id: selectedAddressId,
        delivery_mode: selectedMode,
        payment_mode: paymentMode,
        scheduled_delivery_date: payloadDate,
        items: cart.map((i) => ({
          variant_id: i.variant.id,
          brand_id: i.brand_id,
          qty: i.qty,
        })),
      };

      const created = await customerApi.placeMaterialOrder(payload);
      setCart([]);
      onPlaced(created);
    } catch (err: any) {
      setError(err?.message || "Failed to place material order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCatalog) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-white p-12 shadow-xs border border-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-xs font-medium text-slate-500">Loading catalog…</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmitOrder} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Select Building Materials</h2>
          <p className="text-xs text-slate-500">
            Browse construction materials and configure specifications
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">1. Category</label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {loadingProducts ? (
          <div className="p-6 text-center text-xs text-slate-400">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No products available for this category.
          </div>
        ) : (
          <div className="space-y-3.5 border-t border-slate-100 pt-3.5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">2. Product</label>
                <select
                  value={selectedProduct?.id || ""}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    setSelectedProduct(p || null);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">3. Specifications / Variant</label>
                <select
                  value={selectedVariant?.id || ""}
                  onChange={(e) => {
                    const v = selectedProduct?.variants.find((x) => x.id === e.target.value);
                    setSelectedVariant(v || null);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                >
                  {selectedProduct?.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Brand</label>
                <select
                  value={selectedBrandId}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                >
                  {selectedVariant?.brands && selectedVariant.brands.length > 0 ? (
                    selectedVariant.brands.map((b) => (
                      <option key={b.brand_id} value={b.brand_id}>
                        {b.brand_name} (₹{b.unit_price}/{selectedVariant.unit})
                      </option>
                    ))
                  ) : (
                    <option value="">Generic / Standard (₹{unitPrice}/{selectedVariant?.unit || "Unit"})</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Quantity ({selectedVariant?.unit || "Units"})
                </label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
                >
                  Add to Order (₹{(unitPrice * qty).toFixed(2)})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Selected Items ({cart.length})
          </h3>
          <div className="space-y-1.5">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 border border-slate-200/70"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900">{item.product.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.variant.name} · {item.brand_name} · {item.qty} {item.variant.unit} × ₹{item.unit_price}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-900">
                    ₹{item.line_total.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <DeliveryAddressManager
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          onSelectAddress={setSelectedAddressId}
          onAddressChange={onAddressChange}
        />
      </div>

      {/* The same two choices the rental checkout offers, in the same words.
          It is not cosmetic: a cash order settles differently — the driver
          collects, the vendor carries a shortfall until it is recovered, and
          deduction rules scoped to `cod` only fire on this value. */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Payment Mode
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              {
                mode: "online" as const,
                label: "Pay online",
                blurb: "Paid up front through the gateway.",
              },
              {
                mode: "cod" as const,
                label: "Cash on delivery",
                blurb: "The driver collects cash at the door.",
              },
            ]
          ).map((pm) => {
            const isSelected = paymentMode === pm.mode;
            return (
              <div
                key={pm.mode}
                onClick={() => setPaymentMode(pm.mode)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-50/30 ring-1 ring-amber-500 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payment_mode_selection"
                    checked={isSelected}
                    onChange={() => setPaymentMode(pm.mode)}
                    className="h-4 w-4 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs font-bold text-slate-900">{pm.label}</span>
                </div>
                <p className="mt-2 text-xs text-slate-600">{pm.blurb}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Delivery Mode
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {deliveryModes.map((dm) => {
            const isSelected = selectedMode === dm.mode;
            const sc = parseFloat(dm.surcharge_amount || "0");
            return (
              <div
                key={dm.mode}
                onClick={() => setSelectedMode(dm.mode)}
                className={`relative cursor-pointer rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-50/30 ring-1 ring-amber-500 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="delivery_mode_selection"
                      checked={isSelected}
                      onChange={() => setSelectedMode(dm.mode)}
                      className="h-4 w-4 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs font-bold text-slate-900">{dm.label}</span>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1 text-xs">
                  {/* The mode's own delivery fee — the same figure the bill
                      below adds, so the picker and the total agree. */}
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Delivery</span>
                    <span className={`font-semibold ${sc > 0 ? "text-amber-800" : "text-slate-700"}`}>
                      {sc > 0 ? `₹${sc.toFixed(2)}` : "Free"}
                    </span>
                  </div>
                  {dm.eta_date && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Est. Delivery</span>
                      <span className="font-medium text-slate-900">
                        {new Date(dm.eta_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedMode === "scheduled" && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <label className="text-xs font-semibold text-slate-700">Select Custom Delivery Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Summary & Total
        </h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>₹{quotedSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>
              GST
              {quote && quote.lines.length > 0 && (
                <span className="ml-1 text-slate-400">
                  ({[...new Set(quote.lines.map((l) => l.tax_rate_pct))]
                    .sort((a, b) => a - b)
                    .map((pct) => `${pct}%`)
                    .join(" / ")}
                  )
                </span>
              )}
            </span>
            <span>{quoting && !quote ? "…" : `₹${taxTotal.toFixed(2)}`}</span>
          </div>
          {/* Which rate hit which line. Cement, brick and steel are not taxed
              alike, so one blended percentage would be a fiction. */}
          {quote && new Set(quote.lines.map((l) => l.tax_rate_pct)).size > 1 && (
            <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-500">
              {[...new Set(quote.lines.map((l) => l.tax_rate_pct))]
                .sort((a, b) => a - b)
                .map((pct) => {
                  const forRate = quote.lines.filter((l) => l.tax_rate_pct === pct);
                  const tax = forRate.reduce((a, l) => a + l.tax_amount, 0);
                  return (
                    <div key={pct} className="flex justify-between">
                      <span>
                        {pct}% on {forRate.length} item{forRate.length === 1 ? "" : "s"}
                      </span>
                      <span>₹{tax.toFixed(2)}</span>
                    </div>
                  );
                })}
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>
              Delivery
              {currentModeObj && (
                <span className="ml-1 text-slate-400">({currentModeObj.label})</span>
              )}
            </span>
            <span>{shippingTotal > 0 ? `₹${shippingTotal.toFixed(2)}` : "Free"}</span>
          </div>
          {(quote?.surcharge_amount ?? 0) > 0 && (
            <div className="flex justify-between text-amber-800 font-semibold">
              <span>Surcharge</span>
              <span>+₹{(quote?.surcharge_amount ?? 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-900">
            <span>Grand Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || cart.length === 0}
          className="w-full rounded-lg bg-amber-500 py-2.5 text-center text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-xs"
        >
          {submitting ? "Placing Order…" : `Place Material Order (₹${grandTotal.toFixed(2)})`}
        </button>
      </div>
    </form>
  );
}
