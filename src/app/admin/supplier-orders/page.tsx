"use client";

import { useState, useEffect } from "react";
import type { SupplierOrder, SupplierOrderStatus } from "@/lib/supplier-orders-store";

interface ProductOption {
  id: string;
  name: string;
  itemNo: string;
  category: string | null;
}

interface ItemRow {
  productId: string;
  skids: string;
  boxes: string;
  pricePerUnit: string;
}

const STATUS_COLORS: Record<SupplierOrderStatus, { bg: string; text: string }> = {
  incoming: { bg: "#fef9c3", text: "#854d0e" },
  received: { bg: "#dcfce7", text: "#166534" },
  cancelled: { bg: "#fee2e2", text: "#991b1b" },
};

const STATUS_LABELS: Record<SupplierOrderStatus, string> = {
  incoming: "Incoming",
  received: "Received",
  cancelled: "Cancelled",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtMoney(n: number) {
  return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const BLANK_ROW: ItemRow = { productId: "", skids: "", boxes: "", pricePerUnit: "" };

const inputStyle = {
  border: "1px solid #03033f33",
  color: "#03033f",
  fontFamily: "var(--font-brand), sans-serif",
  outline: "none",
  backgroundColor: "#fff",
};

export default function SupplierOrdersPage() {
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SupplierOrderStatus | "all">("incoming");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([{ ...BLANK_ROW }]);

  async function load() {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch("/api/admin/supplier-orders"),
        fetch("/api/admin/products-list"),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setDeliveryDate("");
    setNotes("");
    setRows([{ ...BLANK_ROW }]);
    setFormError("");
  }

  function updateRow(i: number, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    for (const r of rows) {
      if (!r.productId) { setFormError("Please select a product for each row."); return; }
      if (!r.boxes || Number(r.boxes) <= 0) { setFormError("Boxes must be greater than 0 for each row."); return; }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/supplier-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: rows.map((r) => ({
            productId: r.productId,
            skids: Number(r.skids) || 0,
            boxes: Number(r.boxes),
            pricePerUnit: Number(r.pricePerUnit) || 0,
          })),
          approxDeliveryDate: deliveryDate || undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setFormError(d.error ?? "Failed to save. Please try again.");
        return;
      }
      const created: SupplierOrder = await res.json();
      setOrders((prev) => [created, ...prev]);
      resetForm();
      setShowForm(false);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: SupplierOrderStatus) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/supplier-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated: SupplierOrder = await res.json();
        setOrders((prev) => prev.map((o) => o.id === id ? updated : o));
      }
    } finally {
      setUpdating(null);
    }
  }

  const filtered = orders.filter((o) => statusFilter === "all" ? true : o.status === statusFilter);
  const incomingCount = orders.filter((o) => o.status === "incoming").length;
  const receivedCount = orders.filter((o) => o.status === "received").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
            Supplier Orders
          </h1>
          <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); if (showForm) resetForm(); }}
          className="px-4 py-2 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-70"
          style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
        >
          {showForm ? "✕ Cancel" : "+ New Order"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Incoming", value: incomingCount, color: "#854d0e", bg: "#fef9c3" },
          { label: "Received", value: receivedCount, color: "#166534", bg: "#dcfce7" },
        ].map((s) => (
          <div key={s.label} className="p-5 flex flex-col gap-1" style={{ backgroundColor: s.bg, border: "1px solid rgba(0,0,0,0.06)" }}>
            <span className="text-3xl font-bold" style={{ color: s.color, fontFamily: "var(--font-brand), sans-serif" }}>{s.value}</span>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: s.color + "aa", fontFamily: "var(--font-brand), sans-serif" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* New order form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6 bg-white" style={{ border: "1px solid #03033f14" }}>
          <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
            New Supplier Order
          </h2>

          {/* Items table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid #03033f14" }}>
                  {["Product", "Skids", "Boxes", "Price / Box", "Total", ""].map((h) => (
                    <th key={h} className="pb-2 pr-3 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const total = (Number(row.boxes) || 0) * (Number(row.pricePerUnit) || 0);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #03033f08" }}>
                      <td className="py-2 pr-3">
                        <select
                          required
                          value={row.productId}
                          onChange={(e) => updateRow(i, { productId: e.target.value })}
                          className="px-2 py-1.5 text-xs w-52"
                          style={inputStyle}
                        >
                          <option value="">Select product…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number" min="0" step="1"
                          value={row.skids}
                          onChange={(e) => updateRow(i, { skids: e.target.value })}
                          className="px-2 py-1.5 text-xs w-16"
                          style={inputStyle}
                          placeholder="0"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number" min="1" step="1" required
                          value={row.boxes}
                          onChange={(e) => updateRow(i, { boxes: e.target.value })}
                          className="px-2 py-1.5 text-xs w-20"
                          style={inputStyle}
                          placeholder="0"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: "#03033f66" }}>$</span>
                          <input
                            type="number" min="0" step="0.01"
                            value={row.pricePerUnit}
                            onChange={(e) => updateRow(i, { pricePerUnit: e.target.value })}
                            className="px-2 py-1.5 text-xs w-24"
                            style={inputStyle}
                            placeholder="0.00"
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-xs font-bold whitespace-nowrap" style={{ color: "#03033f" }}>
                        {total > 0 ? `$${fmtMoney(total)}` : "—"}
                      </td>
                      <td className="py-2">
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-xs hover:opacity-50 transition-opacity font-bold"
                            style={{ color: "#dc2626" }}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { ...BLANK_ROW }])}
            className="self-start text-xs font-bold tracking-widest uppercase hover:opacity-60 transition-opacity"
            style={{ color: "#03033f88", fontFamily: "var(--font-brand), sans-serif" }}
          >
            + Add Product
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                Approx. Delivery Date <span style={{ color: "#03033f55" }}>(optional)</span>
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="px-3 py-2 text-sm"
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                Notes <span style={{ color: "#03033f55" }}>(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="px-3 py-2 text-sm"
                style={inputStyle}
                placeholder="Supplier name, reference #, etc."
              />
            </div>
          </div>

          {formError && (
            <div className="px-4 py-3 text-xs" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
              {formError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
            >
              {submitting ? "Saving…" : "Save Order"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="px-6 py-2.5 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-60"
              style={{ border: "1px solid #03033f33", color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["incoming", "received", "cancelled", "all"] as const).map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition-colors capitalize"
              style={{
                fontFamily: "var(--font-brand), sans-serif",
                backgroundColor: active ? "#03033f" : "transparent",
                color: active ? "#fff" : "#03033f99",
                border: active ? "1px solid #03033f" : "1px solid #03033f33",
              }}
            >
              {s}
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
                {["Order", "Created", "Est. Delivery", "Items", "Total Value", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const isExpanded = expanded === order.id;
                const sc = STATUS_COLORS[order.status];
                const totalValue = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
                const totalBoxes = order.items.reduce((sum, item) => sum + item.boxes, 0);
                return (
                  <>
                    <tr
                      key={order.id}
                      style={{ borderBottom: "1px solid #03033f08" }}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : order.id)}
                    >
                      <td className="px-4 py-3 font-bold text-xs" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                        #{order.id.slice(-6)}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#03033f88" }}>
                        {fmtDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#03033f88" }}>
                        {order.approxDeliveryDate ? fmtDate(order.approxDeliveryDate) : <span style={{ color: "#03033f33" }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}>
                        {order.items.length} product{order.items.length !== 1 ? "s" : ""} · {totalBoxes} boxes
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: "#03033f" }}>
                        {totalValue > 0 ? `$${fmtMoney(totalValue)}` : <span style={{ color: "#03033f33" }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: sc.bg, color: sc.text, fontFamily: "var(--font-brand), sans-serif" }}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {order.status === "incoming" && (
                            <>
                              <button
                                disabled={updating === order.id}
                                onClick={() => setStatus(order.id, "received")}
                                className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40 whitespace-nowrap"
                                style={{ backgroundColor: "#16a34a", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
                              >
                                Mark Received
                              </button>
                              <button
                                disabled={updating === order.id}
                                onClick={() => setStatus(order.id, "cancelled")}
                                className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40"
                                style={{ border: "1px solid #dc262633", color: "#dc2626", fontFamily: "var(--font-brand), sans-serif" }}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {order.status !== "incoming" && (
                            <button
                              disabled={updating === order.id}
                              onClick={() => setStatus(order.id, "incoming")}
                              className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40"
                              style={{ border: "1px solid #03033f33", color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${order.id}-detail`} style={{ backgroundColor: "#f8f8fb", borderBottom: "1px solid #03033f08" }}>
                        <td colSpan={7} className="px-6 py-4">
                          <div className="flex flex-col gap-3">
                            <table className="text-xs border-collapse" style={{ maxWidth: 640 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid #03033f14" }}>
                                  {["Product", "Skids", "Boxes", "Price / Box", "Total"].map((h) => (
                                    <th key={h} className="py-1 pr-6 text-left font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item, i) => (
                                  <tr key={i} style={{ borderBottom: "1px solid #03033f08" }}>
                                    <td className="py-1.5 pr-6 font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{item.name}</td>
                                    <td className="py-1.5 pr-6" style={{ color: "#03033f" }}>{item.skids}</td>
                                    <td className="py-1.5 pr-6" style={{ color: "#03033f" }}>{item.boxes}</td>
                                    <td className="py-1.5 pr-6" style={{ color: "#03033f" }}>{item.pricePerUnit > 0 ? `$${fmtMoney(item.pricePerUnit)}` : "—"}</td>
                                    <td className="py-1.5" style={{ color: "#03033f" }}>{item.totalPrice > 0 ? `$${fmtMoney(item.totalPrice)}` : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {order.notes && (
                              <p className="text-xs" style={{ color: "#03033f88" }}>
                                <strong style={{ color: "#03033f" }}>Notes:</strong> {order.notes}
                              </p>
                            )}
                            {order.receivedAt && (
                              <p className="text-xs" style={{ color: "#03033f88" }}>
                                <strong style={{ color: "#03033f" }}>Received:</strong> {fmtDateTime(order.receivedAt)}
                              </p>
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
