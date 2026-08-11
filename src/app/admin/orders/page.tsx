"use client";

import { useState, useEffect, useRef } from "react";
import type { WebOrder, OrderStatus, OrderItem } from "@/lib/orders-store";
import type { PublicCustomer } from "@/lib/customers-store";
import type { Driver } from "@/lib/drivers-store";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductOption {
  id: string;
  name: string;
  itemNo: string;
  category: string | null;
  pricingType: "per_weight" | "per_box" | "per_weight_direct";
  weightUnit: "KG" | "LB";
  pricePerUnit: number | null;
}

interface OrderItemRow { productId: string; qty: string; }

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending:   { bg: "#fef9c3", text: "#854d0e" },
  accepted:  { bg: "#ffedd5", text: "#c2410c" },
  invoiced:  { bg: "#dbeafe", text: "#1e40af" },
  fulfilled: { bg: "#dcfce7", text: "#166534" },
  cancelled: { bg: "#fee2e2", text: "#991b1b" },
  archived:  { bg: "#f1f5f9", text: "#475569" },
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   "Pending",
  accepted:  "Accepted",
  invoiced:  "Invoiced",
  fulfilled: "Delivered",
  cancelled: "Cancelled",
  archived:  "Archived",
};

type FilterKey = OrderStatus | "all";

const inputStyle = {
  border: "1px solid #03033f33",
  color: "#03033f",
  fontFamily: "var(--font-brand), sans-serif",
  outline: "none",
  backgroundColor: "#fff",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Finalize Modal ──────────────────────────────────────────────────────────

function FinalizeModal({
  order,
  products,
  onFinalized,
  onClose,
}: {
  order: WebOrder;
  products: ProductOption[];
  onFinalized: (updated: WebOrder) => void;
  onClose: () => void;
}) {
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Per line item: total weight (string for input), fireSale toggle, custom price
  const [lines, setLines] = useState(() =>
    order.items.map((item) => {
      const p = productMap.get(item.productId);
      return {
        item,
        product: p,
        totalWeight: "",
        fireSale: false,
        customPrice: p?.pricePerUnit != null ? String(p.pricePerUnit) : "",
      };
    })
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function setTotalWeight(lineIdx: number, val: string) {
    setLines((prev) => prev.map((l, i) => i === lineIdx ? { ...l, totalWeight: val } : l));
  }

  function toggleFireSale(lineIdx: number) {
    setLines((prev) => prev.map((l, i) => i === lineIdx ? { ...l, fireSale: !l.fireSale } : l));
  }

  function setCustomPrice(lineIdx: number, val: string) {
    setLines((prev) => prev.map((l, i) => i === lineIdx ? { ...l, customPrice: val } : l));
  }

  function lineTotal(line: typeof lines[0]): number | null {
    const price = Number(line.customPrice);
    if (!price || price <= 0) return null;
    const p = line.product;
    if (!p) return null;
    if (p.pricingType === "per_box") {
      return price * line.item.qty;
    }
    const w = Number(line.totalWeight);
    if (!w || w <= 0) return null;
    return price * w;
  }

  const orderTotal = lines.every((l) => lineTotal(l) !== null)
    ? lines.reduce((s, l) => s + (lineTotal(l) ?? 0), 0)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    for (const line of lines) {
      const p = line.product;
      if (!p) continue;
      if (!line.customPrice || Number(line.customPrice) <= 0) {
        setError(`Missing price for ${line.item.name}.`);
        return;
      }
      if (p.pricingType === "per_weight") {
        if (!line.totalWeight || Number(line.totalWeight) <= 0) {
          setError(`Enter total weight for ${line.item.name}.`);
          return;
        }
      }
    }

    if (orderTotal === null) { setError("Could not compute total."); return; }

    const updatedItems: OrderItem[] = lines.map((line) => {
      const p = line.product;
      const price = Number(line.customPrice);
      const tot = lineTotal(line) ?? 0;
      return {
        ...line.item,
        pricingType: p?.pricingType,
        weightUnit: p?.weightUnit,
        totalWeight: p?.pricingType === "per_weight" ? Number(line.totalWeight) : undefined,
        pricePerUnit: price,
        lineTotal: tot,
      };
    });

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invoiced", items: updatedItems, invoiceTotal: orderTotal }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed."); return; }
      onFinalized(await res.json());
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #03033f14" }}>
          <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
            Finalize Order #{order.id.slice(-6)}
          </h2>
          <button onClick={onClose} className="text-lg hover:opacity-50" style={{ color: "#03033f66" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          {lines.map((line, lineIdx) => {
            const p = line.product;
            const isPerBox = p?.pricingType === "per_box";
            const tot = lineTotal(line);
            return (
              <div key={line.item.productId} className="flex flex-col gap-3 pb-6" style={{ borderBottom: "1px solid #03033f08" }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                      {line.item.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#03033f55" }}>
                      {line.item.qty} {line.item.qty === 1 ? "box" : "boxes"}{isPerBox ? " · flat rate/box" : ` · charged by ${p?.weightUnit ?? "weight"}`}
                    </p>
                  </div>
                  {tot !== null && (
                    <span className="text-sm font-bold whitespace-nowrap" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                      {fmtMoney(tot)}
                    </span>
                  )}
                </div>

                {/* Total weight for per_weight products */}
                {!isPerBox && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
                      Total Weight ({p?.weightUnit ?? "KG"})
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.totalWeight}
                        onChange={(e) => setTotalWeight(lineIdx, e.target.value)}
                        className="w-28 px-2 py-1.5 text-xs text-right"
                        style={inputStyle}
                        placeholder="0.00"
                      />
                      <span className="text-xs" style={{ color: "#03033f55" }}>{p?.weightUnit ?? "kg"}</span>
                    </div>
                  </div>
                )}

                {/* Price row */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
                      {line.fireSale ? "Fire-Sale Price" : "Price"} (${isPerBox ? "/box" : `/${p?.weightUnit ?? "kg"}`})
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs" style={{ color: "#03033f55" }}>$</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.customPrice}
                        onChange={(e) => setCustomPrice(lineIdx, e.target.value)}
                        className="w-24 px-2 py-1.5 text-xs text-right"
                        style={{ ...inputStyle, borderColor: line.fireSale ? "#dc2626" : "#03033f33" }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFireSale(lineIdx)}
                    className="text-xs font-bold tracking-widest uppercase px-2 py-1.5 transition-colors"
                    style={{
                      fontFamily: "var(--font-brand), sans-serif",
                      color: line.fireSale ? "#fff" : "#dc2626",
                      backgroundColor: line.fireSale ? "#dc2626" : "transparent",
                      border: "1px solid #dc262644",
                    }}
                  >
                    🔥 Fire-Sale
                  </button>
                </div>
              </div>
            );
          })}

          {/* Order total */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Order Total</span>
            <span className="text-xl font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
              {orderTotal !== null ? fmtMoney(orderTotal) : "—"}
            </span>
          </div>

          {error && (
            <div className="px-4 py-3 text-xs" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || orderTotal === null}
              className="px-6 py-2.5 text-xs font-bold tracking-widest uppercase hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
            >
              {submitting ? "Saving…" : "Create Invoice"}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs font-bold tracking-widest uppercase hover:opacity-60" style={{ border: "1px solid #03033f33", color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Customer Combobox ───────────────────────────────────────────────────────

function CustomerCombobox({
  customers,
  selected,
  onSelect,
}: {
  customers: PublicCustomer[];
  selected: PublicCustomer | null;
  onSelect: (c: PublicCustomer | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? customers.filter((c) =>
        [c.name, c.company ?? "", c.email].some((s) => s.toLowerCase().includes(query.toLowerCase()))
      )
    : customers;

  function pick(c: PublicCustomer) {
    onSelect(c);
    setQuery(c.name + (c.company ? ` — ${c.company}` : ""));
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
          onFocus={() => setOpen(true)}
          className="flex-1 px-3 py-2 text-sm"
          style={inputStyle}
          placeholder={customers.length === 0 ? "No customers yet — enter details manually below" : "Search by name, company, or email…"}
        />
        {selected && (
          <button type="button" onClick={clear} className="text-xs px-2 hover:opacity-50 transition-opacity" style={{ color: "#dc2626" }}>✕</button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto"
          style={{ backgroundColor: "#fff", border: "1px solid #03033f22", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
        >
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <div className="text-xs font-bold" style={{ color: "#03033f" }}>{c.name}{c.company ? ` — ${c.company}` : ""}</div>
              <div className="text-xs" style={{ color: "#03033f66" }}>{c.email}{c.phone ? ` · ${c.phone}` : ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── New Order Form ──────────────────────────────────────────────────────────

function NewOrderForm({
  customers,
  products,
  onCreated,
  onCancel,
}: {
  customers: PublicCustomer[];
  products: ProductOption[];
  onCreated: (order: WebOrder) => void;
  onCancel: () => void;
}) {
  const [selectedCustomer, setSelectedCustomer] = useState<PublicCustomer | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [itemRows, setItemRows] = useState<OrderItemRow[]>([{ productId: "", qty: "" }]);
  const [fulfillment, setFulfillment] = useState<"" | "pickup" | "delivery">("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateRow(i: number, patch: Partial<OrderItemRow>) {
    setItemRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!fulfillment) { setError("Please select a fulfillment method."); return; }
    if (fulfillment === "delivery" && !address.trim()) { setError("Delivery address is required."); return; }
    for (const r of itemRows) {
      if (!r.productId) { setError("Please select a product for each row."); return; }
      if (!r.qty || Number(r.qty) <= 0) { setError("Quantity must be greater than 0."); return; }
    }
    if (!selectedCustomer && !manualName.trim()) { setError("Customer name is required."); return; }
    if (!selectedCustomer && !manualEmail.trim()) { setError("Customer email is required."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer?.id,
          customerName: selectedCustomer ? undefined : manualName,
          customerCompany: selectedCustomer ? undefined : manualCompany || undefined,
          customerEmail: selectedCustomer ? undefined : manualEmail,
          customerPhone: selectedCustomer ? undefined : manualPhone || undefined,
          items: itemRows.map((r) => ({ productId: r.productId, qty: Number(r.qty) })),
          fulfillment,
          address: fulfillment === "delivery" ? address : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed to create order."); return; }
      onCreated(await res.json());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 flex flex-col gap-5" style={{ border: "1px solid #03033f14" }}>
      <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>New Customer Order</h2>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Customer</label>
        <CustomerCombobox customers={customers} selected={selectedCustomer} onSelect={setSelectedCustomer} />
      </div>

      {!selectedCustomer && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {[
            { key: "name", label: "Name *", value: manualName, set: setManualName, required: true, placeholder: "Jane Smith" },
            { key: "company", label: "Company (optional)", value: manualCompany, set: setManualCompany, required: false, placeholder: "The Grand Restaurant" },
            { key: "email", label: "Email *", value: manualEmail, set: setManualEmail, required: true, placeholder: "jane@restaurant.com" },
            { key: "phone", label: "Phone (optional)", value: manualPhone, set: setManualPhone, required: false, placeholder: "(403) 555-0100" },
          ].map(({ key, label, value, set, required, placeholder }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>{label}</label>
              <input type="text" required={required} value={value} onChange={(e) => set(e.target.value)} className="px-3 py-2 text-sm" style={inputStyle} placeholder={placeholder} />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Products</label>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid #03033f14" }}>
                {["Product", "Cases", ""].map((h) => (
                  <th key={h} className="pb-2 pr-4 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itemRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #03033f08" }}>
                  <td className="py-2 pr-4">
                    <select required value={row.productId} onChange={(e) => updateRow(i, { productId: e.target.value })} className="px-2 py-1.5 text-xs w-64" style={inputStyle}>
                      <option value="">Select product…</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <input type="number" min="1" step="1" required value={row.qty} onChange={(e) => updateRow(i, { qty: e.target.value })} className="px-2 py-1.5 text-xs w-20" style={inputStyle} placeholder="0" />
                  </td>
                  <td className="py-2">
                    {itemRows.length > 1 && (
                      <button type="button" onClick={() => setItemRows((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs hover:opacity-50 font-bold" style={{ color: "#dc2626" }}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setItemRows((prev) => [...prev, { productId: "", qty: "" }])} className="self-start text-xs font-bold tracking-widest uppercase hover:opacity-60 transition-opacity" style={{ color: "#03033f88", fontFamily: "var(--font-brand), sans-serif" }}>
          + Add Product
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Fulfillment *</label>
        <div className="flex gap-3">
          {(["pickup", "delivery"] as const).map((option) => {
            const active = fulfillment === option;
            return (
              <button key={option} type="button" onClick={() => setFulfillment(option)} className="flex-1 py-2 text-xs font-bold tracking-widest uppercase transition-colors" style={{ fontFamily: "var(--font-brand), sans-serif", backgroundColor: active ? "#03033f" : "transparent", color: active ? "#fff" : "#03033f99", border: `1px solid ${active ? "#03033f" : "#03033f33"}` }}>
                {option === "pickup" ? "Pick-Up" : "Delivery"}
              </button>
            );
          })}
        </div>
        {fulfillment === "delivery" && (
          <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className="px-3 py-2 text-sm mt-1" style={inputStyle} placeholder="Delivery address" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Notes <span style={{ color: "#03033f55" }}>(optional)</span></label>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="px-3 py-2 text-sm resize-none" style={inputStyle} placeholder="Special instructions, etc." />
      </div>

      {error && <div className="px-4 py-3 text-xs" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>{error}</div>}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="px-6 py-2.5 text-xs font-bold tracking-widest uppercase hover:opacity-80 disabled:opacity-40" style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}>
          {submitting ? "Saving…" : "Create Order"}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2.5 text-xs font-bold tracking-widest uppercase hover:opacity-60" style={{ border: "1px solid #03033f33", color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CustomerOrders() {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [customers, setCustomers] = useState<PublicCustomer[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterKey>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [finalizing, setFinalizing] = useState<WebOrder | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [ordersRes, customersRes, productsRes, driversRes] = await Promise.all([
        fetch("/api/admin/orders"),
        fetch("/api/customers"),
        fetch("/api/admin/products-list"),
        fetch("/api/admin/drivers"),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (customersRes.ok) setCustomers(await customersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (driversRes.ok) setDrivers(await driversRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: OrderStatus) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated: WebOrder = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      }
    } finally {
      setUpdating(null);
    }
  }

  function cancelOrder(order: WebOrder) {
    const lines = ["Cancel this order?"];
    if (order.invoiceTotal != null) {
      lines.push(`This removes ${fmtMoney(order.invoiceTotal)} from ${order.customer.name}'s outstanding balance.`);
    }
    if (order.stripePaid) {
      lines.push(`⚠ This order was already paid via Stripe (${fmtMoney(order.stripeAmountCharged ?? order.invoiceTotal ?? 0)} charged). Cancelling will NOT automatically refund the customer — you'll need to issue that refund manually in Stripe.`);
    }
    if (!window.confirm(lines.join("\n\n"))) return;
    setStatus(order.id, "cancelled");
  }

  async function assignDriver(id: string, driverId: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: driverId || null }),
      });
      if (res.ok) {
        const updated: WebOrder = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      }
    } finally {
      setUpdating(null);
    }
  }

  function exportCsv(status: "pending" | "all") {
    window.location.href = `/api/admin/orders/export?status=${status}`;
  }

  const filtered = orders.filter((o) => {
    if (statusFilter === "all") return o.status === "pending" || o.status === "accepted" || o.status === "invoiced" || o.status === "fulfilled";
    return o.status === statusFilter;
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const acceptedCount = orders.filter((o) => o.status === "accepted").length;
  const invoicedCount = orders.filter((o) => o.status === "invoiced").length;
  const deliveredToday = orders.filter((o) => {
    if (o.status !== "fulfilled" || !o.fulfilledAt) return false;
    return new Date(o.fulfilledAt).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Finalize modal */}
      {finalizing && (
        <FinalizeModal
          order={finalizing}
          products={products}
          onFinalized={(updated) => {
            setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
            setFinalizing(null);
          }}
          onClose={() => setFinalizing(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Customer Orders</h1>
          <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowNewOrder((v) => !v)}
            className="px-4 py-2 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-70"
            style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
          >
            {showNewOrder ? "✕ Cancel" : "+ New Order"}
          </button>
          <button onClick={() => exportCsv("pending")} className="px-4 py-2 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-70" style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
            Export Pending
          </button>
          <button onClick={() => exportCsv("all")} className="px-4 py-2 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-70" style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
            Export All
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending",         value: pendingCount,   color: "#854d0e", bg: "#fef9c3" },
          { label: "Accepted",        value: acceptedCount,  color: "#c2410c", bg: "#ffedd5" },
          { label: "Invoiced",        value: invoicedCount,  color: "#1e40af", bg: "#dbeafe" },
          { label: "Delivered Today", value: deliveredToday, color: "#166534", bg: "#dcfce7" },
        ].map((s) => (
          <div key={s.label} className="p-5 flex flex-col gap-1" style={{ backgroundColor: s.bg, border: "1px solid rgba(0,0,0,0.06)" }}>
            <span className="text-3xl font-bold" style={{ color: s.color, fontFamily: "var(--font-brand), sans-serif" }}>{s.value}</span>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: s.color + "aa", fontFamily: "var(--font-brand), sans-serif" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* New order form */}
      {showNewOrder && (
        <NewOrderForm
          customers={customers}
          products={products}
          onCreated={(order) => { setOrders((prev) => [order, ...prev]); setShowNewOrder(false); }}
          onCancel={() => setShowNewOrder(false)}
        />
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "accepted", "invoiced", "fulfilled", "cancelled", "archived", "all"] as const).map((s) => {
          const active = statusFilter === s;
          const label = s === "fulfilled" ? "Delivered" : s === "all" ? "Active" : s;
          return (
            <button key={s} onClick={() => setStatusFilter(s)} className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition-colors capitalize" style={{ fontFamily: "var(--font-brand), sans-serif", backgroundColor: active ? "#03033f" : "transparent", color: active ? "#fff" : "#03033f99", border: active ? "1px solid #03033f" : "1px solid #03033f33" }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Orders table */}
      <div className="bg-white overflow-x-auto">
        {loading ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>No orders</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid #03033f14" }}>
                {["Order", "Date", "Customer", "Items", "Total", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const isExpanded = expanded === order.id;
                const sc = STATUS_COLORS[order.status];
                return (
                  <>
                    <tr key={order.id} style={{ borderBottom: "1px solid #03033f08" }} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpanded(isExpanded ? null : order.id)}>
                      <td className="px-4 py-3 font-bold text-xs" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>#{order.id.slice(-6)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#03033f88" }}>{fmt(order.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold" style={{ color: "#03033f" }}>{order.customer.name}</div>
                        {order.customer.company && <div className="text-xs" style={{ color: "#03033f66" }}>{order.customer.company}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}>
                        {(() => {
                          const total = order.items.reduce((s, i) => s + i.qty, 0);
                          const allWeightDirect = order.items.every(i => productMap.get(i.productId)?.pricingType === "per_weight_direct");
                          const anyWeightDirect = order.items.some(i => productMap.get(i.productId)?.pricingType === "per_weight_direct");
                          const unit = allWeightDirect
                            ? (productMap.get(order.items[0]?.productId ?? "")?.weightUnit ?? "LB")
                            : anyWeightDirect ? "items" : "cases";
                          return `${order.items.length} line${order.items.length !== 1 ? "s" : ""} · ${total} ${unit}`;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: "#03033f" }}>
                        {order.invoiceTotal != null ? fmtMoney(order.invoiceTotal) : <span style={{ color: "#03033f33" }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: sc.bg, color: sc.text, fontFamily: "var(--font-brand), sans-serif" }}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {order.status === "pending" && (
                            <>
                              <button disabled={updating === order.id} onClick={() => setStatus(order.id, "accepted")} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40 whitespace-nowrap" style={{ backgroundColor: "#c2410c", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}>Accept</button>
                              <button disabled={updating === order.id} onClick={() => setFinalizing(order)} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40 whitespace-nowrap" style={{ backgroundColor: "#1e40af", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}>Finalize & Invoice</button>
                              <button disabled={updating === order.id} onClick={() => setStatus(order.id, "cancelled")} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40" style={{ border: "1px solid #dc262633", color: "#dc2626", fontFamily: "var(--font-brand), sans-serif" }}>Cancel</button>
                            </>
                          )}
                          {order.status === "accepted" && (
                            <>
                              <button disabled={updating === order.id} onClick={() => setFinalizing(order)} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40 whitespace-nowrap" style={{ backgroundColor: "#1e40af", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}>Finalize & Invoice</button>
                              <button disabled={updating === order.id} onClick={() => setStatus(order.id, "cancelled")} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40" style={{ border: "1px solid #dc262633", color: "#dc2626", fontFamily: "var(--font-brand), sans-serif" }}>Cancel</button>
                            </>
                          )}
                          {order.status === "invoiced" && (
                            <>
                              {order.fulfillment === "delivery" && (
                                <>
                                  <select
                                    value={order.assignedDriverId ?? ""}
                                    disabled={updating === order.id}
                                    onChange={(e) => assignDriver(order.id, e.target.value)}
                                    className="px-2 py-1.5 text-xs"
                                    style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                                  >
                                    <option value="">Unassigned</option>
                                    {drivers.filter((d) => d.active || d.id === order.assignedDriverId).map((d) => (
                                      <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                  </select>
                                  <span
                                    className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase whitespace-nowrap"
                                    style={{ backgroundColor: "#fef9c3", color: "#854d0e", fontFamily: "var(--font-brand), sans-serif" }}
                                    title="This order will be marked delivered automatically once the assigned driver collects a signature at /driver"
                                  >
                                    Awaiting Driver Signature
                                  </span>
                                </>
                              )}
                              <button
                                disabled={updating === order.id}
                                onClick={() => setStatus(order.id, "fulfilled")}
                                title={order.fulfillment === "delivery" ? "Manual override — normally the driver's signature does this" : undefined}
                                className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40 whitespace-nowrap"
                                style={order.fulfillment === "delivery"
                                  ? { border: "1px solid #03033f33", color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }
                                  : { backgroundColor: "#16a34a", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
                              >
                                {order.fulfillment === "delivery" ? "Mark Delivered (Override)" : "Mark Delivered"}
                              </button>
                              <button disabled={updating === order.id} onClick={() => setStatus(order.id, "pending")} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40" style={{ border: "1px solid #03033f33", color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}>Reopen</button>
                              <button disabled={updating === order.id} onClick={() => cancelOrder(order)} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40" style={{ border: "1px solid #dc262633", color: "#dc2626", fontFamily: "var(--font-brand), sans-serif" }}>Cancel</button>
                            </>
                          )}
                          {order.status === "fulfilled" && (
                            <>
                              <button disabled={updating === order.id} onClick={() => setStatus(order.id, "archived")} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40" style={{ backgroundColor: "#475569", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}>Archive</button>
                              <button disabled={updating === order.id} onClick={() => setStatus(order.id, "invoiced")} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40" style={{ border: "1px solid #03033f33", color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}>Reopen</button>
                              <button disabled={updating === order.id} onClick={() => cancelOrder(order)} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40" style={{ border: "1px solid #dc262633", color: "#dc2626", fontFamily: "var(--font-brand), sans-serif" }}>Cancel</button>
                            </>
                          )}
                          {order.status === "archived" && (
                            <>
                              <button disabled={updating === order.id} onClick={() => setStatus(order.id, "fulfilled")} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40" style={{ border: "1px solid #03033f33", color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}>Reopen</button>
                              <button disabled={updating === order.id} onClick={() => cancelOrder(order)} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40" style={{ border: "1px solid #dc262633", color: "#dc2626", fontFamily: "var(--font-brand), sans-serif" }}>Cancel</button>
                            </>
                          )}
                          {order.status === "cancelled" && (
                            <button disabled={updating === order.id} onClick={() => setStatus(order.id, "pending")} className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40" style={{ border: "1px solid #03033f33", color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}>Reopen</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${order.id}-detail`} style={{ backgroundColor: "#f8f8fb", borderBottom: "1px solid #03033f08" }}>
                        <td colSpan={7} className="px-6 py-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-6 text-xs" style={{ color: "#03033f88" }}>
                              <span><strong style={{ color: "#03033f" }}>Email:</strong> <a href={`mailto:${order.customer.email}`} style={{ color: "#0284c7" }}>{order.customer.email}</a></span>
                              {order.customer.phone && <span><strong style={{ color: "#03033f" }}>Phone:</strong> {order.customer.phone}</span>}
                              {order.customer.company && <span><strong style={{ color: "#03033f" }}>Company:</strong> {order.customer.company}</span>}
                              {order.fulfillment && <span><strong style={{ color: "#03033f" }}>Fulfillment:</strong> {order.fulfillment === "delivery" ? `Delivery${order.address ? ` — ${order.address}` : ""}` : "Pick-Up"}</span>}
                              {order.fulfillment === "delivery" && order.assignedDriverId && (
                                <span><strong style={{ color: "#03033f" }}>Driver:</strong> {drivers.find((d) => d.id === order.assignedDriverId)?.name ?? "Unknown"}</span>
                              )}
                              {order.acceptedAt && <span><strong style={{ color: "#03033f" }}>Accepted:</strong> {fmt(order.acceptedAt)}</span>}
                              {order.invoicedAt && <span><strong style={{ color: "#03033f" }}>Invoiced:</strong> {fmt(order.invoicedAt)}</span>}
                              {order.fulfilledAt && <span><strong style={{ color: "#03033f" }}>Delivered:</strong> {fmt(order.fulfilledAt)}</span>}
                              {order.archivedAt && <span><strong style={{ color: "#03033f" }}>Archived:</strong> {fmt(order.archivedAt)}</span>}
                              {order.cancelledAt && <span><strong style={{ color: "#03033f" }}>Cancelled:</strong> {fmt(order.cancelledAt)}</span>}
                            </div>
                            <div className="overflow-x-auto" style={{ maxWidth: "100%" }}>
                            <table className="text-xs border-collapse" style={{ minWidth: 600 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid #03033f14" }}>
                                  {["Item No", "Product", "Cases", "Weights", "Price", "Line Total"].map((h) => (
                                    <th key={h} className="py-1 pr-6 text-left font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item) => {
                                  const product = productMap.get(item.productId);
                                  const isWeightDirect = product?.pricingType === "per_weight_direct";
                                  const isFinalized = item.lineTotal != null;
                                  const weightUnit = item.weightUnit ?? product?.weightUnit ?? "LB";

                                  // Pre-finalization weight-direct: qty stored in cart IS the weight, not cases
                                  const casesDisplay = isWeightDirect && !isFinalized ? "—" : String(item.qty);

                                  const weightsDisplay = item.totalWeight != null
                                    ? `${item.totalWeight} ${weightUnit}`
                                    : isWeightDirect && !isFinalized
                                    ? `${item.qty} ${product?.weightUnit ?? "LB"}`
                                    : "—";

                                  const effectivePrice = isFinalized ? item.pricePerUnit : isWeightDirect ? product?.pricePerUnit : null;
                                  const priceUnit = isFinalized
                                    ? (item.pricingType === "per_box" ? "box" : weightUnit.toLowerCase())
                                    : isWeightDirect
                                    ? (product?.weightUnit ?? "LB").toLowerCase()
                                    : weightUnit.toLowerCase();
                                  const priceDisplay = effectivePrice != null ? `$${effectivePrice}/${priceUnit}` : "—";

                                  const effectiveTotal = isFinalized
                                    ? item.lineTotal
                                    : isWeightDirect && product?.pricePerUnit != null
                                    ? item.qty * product.pricePerUnit
                                    : null;
                                  const totalDisplay = effectiveTotal != null ? fmtMoney(effectiveTotal) : "—";

                                  return (
                                    <tr key={item.productId} style={{ borderBottom: "1px solid #03033f08" }}>
                                      <td className="py-1.5 pr-6 font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{item.itemNo}</td>
                                      <td className="py-1.5 pr-6" style={{ color: "#03033f" }}>{item.name}</td>
                                      <td className="py-1.5 pr-6" style={{ color: "#03033f" }}>{casesDisplay}</td>
                                      <td className="py-1.5 pr-6 text-xs" style={{ color: "#03033f66" }}>{weightsDisplay}</td>
                                      <td className="py-1.5 pr-6" style={{ color: "#03033f" }}>{priceDisplay}</td>
                                      <td className="py-1.5 font-bold" style={{ color: "#03033f" }}>{totalDisplay}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            </div>
                            {order.invoiceTotal != null && (
                              <p className="text-sm font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                                Order Total: {fmtMoney(order.invoiceTotal)}
                              </p>
                            )}
                            {order.notes && <p className="text-xs" style={{ color: "#03033f88" }}><strong style={{ color: "#03033f" }}>Notes:</strong> {order.notes}</p>}
                            {order.proofOfDelivery && (
                              <div className="flex items-center gap-4 p-3" style={{ backgroundColor: "#f0fdf4", border: "1px solid #16a34a33" }}>
                                <a href={order.proofOfDelivery.signatureUrl} target="_blank" rel="noopener noreferrer" title="Open full-size signature">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={order.proofOfDelivery.signatureUrl}
                                    alt="Customer signature"
                                    style={{ height: 48, backgroundColor: "#fff", border: "1px solid #03033f14" }}
                                  />
                                </a>
                                <div className="text-xs" style={{ color: "#166534" }}>
                                  <div className="font-bold">Proof of Delivery Signed</div>
                                  <div>
                                    {order.proofOfDelivery.signedByName ? `${order.proofOfDelivery.signedByName} · ` : ""}
                                    {fmt(order.proofOfDelivery.signedAt)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
