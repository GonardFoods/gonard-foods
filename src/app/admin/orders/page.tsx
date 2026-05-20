"use client";

import { useState, useEffect } from "react";
import type { WebOrder, OrderStatus } from "@/lib/orders-store";

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  pending:   { bg: "#fef9c3", text: "#854d0e" },
  fulfilled: { bg: "#dcfce7", text: "#166534" },
  cancelled: { bg: "#fee2e2", text: "#991b1b" },
  archived:  { bg: "#f1f5f9", text: "#475569" },
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   "Pending",
  fulfilled: "Delivered",
  cancelled: "Cancelled",
  archived:  "Archived",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

type FilterKey = OrderStatus | "all";

export default function CustomerOrders() {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterKey>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (res.ok) setOrders(await res.json());
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

  function exportCsv(status: "pending" | "all") {
    window.location.href = `/api/admin/orders/export?status=${status}`;
  }

  // "all" tab shows everything except archived; "archived" tab shows only archived
  const filtered = orders.filter((o) => {
    if (statusFilter === "all") return o.status !== "archived";
    return o.status === statusFilter;
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const deliveredToday = orders.filter((o) => {
    if (o.status !== "fulfilled" || !o.fulfilledAt) return false;
    return new Date(o.fulfilledAt).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
            Customer Orders
          </h1>
          <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportCsv("pending")}
            className="px-4 py-2 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-70"
            style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Export Pending CSV
          </button>
          <button
            onClick={() => exportCsv("all")}
            className="px-4 py-2 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-70"
            style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Export All CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending",          value: pendingCount,   color: "#854d0e", bg: "#fef9c3" },
          { label: "Delivered Today",  value: deliveredToday, color: "#166534", bg: "#dcfce7" },
          { label: "Total Orders",     value: orders.filter((o) => o.status !== "archived").length, color: "#03033f", bg: "#f8f8fb" },
        ].map((s) => (
          <div key={s.label} className="p-5 flex flex-col gap-1" style={{ backgroundColor: s.bg, border: "1px solid rgba(0,0,0,0.06)" }}>
            <span className="text-3xl font-bold" style={{ color: s.color, fontFamily: "var(--font-brand), sans-serif" }}>{s.value}</span>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: s.color + "aa", fontFamily: "var(--font-brand), sans-serif" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["pending", "fulfilled", "cancelled", "archived", "all"] as const).map((s) => {
          const active = statusFilter === s;
          const label = s === "fulfilled" ? "Delivered" : s === "all" ? "Active" : s;
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
                {["Order", "Date", "Customer", "Items", "Status", ""].map((h) => (
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
                        {fmt(order.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold" style={{ color: "#03033f" }}>{order.customer.name}</div>
                        {order.customer.company && <div className="text-xs" style={{ color: "#03033f66" }}>{order.customer.company}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}>
                        {order.items.length} line{order.items.length !== 1 ? "s" : ""} · {order.items.reduce((s, i) => s + i.qty, 0)} cases
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: sc.bg, color: sc.text, fontFamily: "var(--font-brand), sans-serif" }}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {order.status === "pending" && (
                            <>
                              <button
                                disabled={updating === order.id}
                                onClick={() => setStatus(order.id, "fulfilled")}
                                className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40 whitespace-nowrap"
                                style={{ backgroundColor: "#16a34a", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
                              >
                                Mark Delivered
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
                          {order.status === "fulfilled" && (
                            <>
                              <button
                                disabled={updating === order.id}
                                onClick={() => setStatus(order.id, "archived")}
                                className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40"
                                style={{ backgroundColor: "#475569", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
                              >
                                Archive
                              </button>
                              <button
                                disabled={updating === order.id}
                                onClick={() => setStatus(order.id, "pending")}
                                className="text-xs font-bold px-3 py-1.5 tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40"
                                style={{ border: "1px solid #03033f33", color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}
                              >
                                Reopen
                              </button>
                            </>
                          )}
                          {order.status === "cancelled" && (
                            <button
                              disabled={updating === order.id}
                              onClick={() => setStatus(order.id, "pending")}
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
                        <td colSpan={6} className="px-6 py-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-6 text-xs" style={{ color: "#03033f88" }}>
                              <span><strong style={{ color: "#03033f" }}>Email:</strong> <a href={`mailto:${order.customer.email}`} style={{ color: "#0284c7" }}>{order.customer.email}</a></span>
                              {order.customer.phone && <span><strong style={{ color: "#03033f" }}>Phone:</strong> {order.customer.phone}</span>}
                              {order.customer.company && <span><strong style={{ color: "#03033f" }}>Company:</strong> {order.customer.company}</span>}
                              {order.fulfilledAt && <span><strong style={{ color: "#03033f" }}>Delivered:</strong> {fmt(order.fulfilledAt)}</span>}
                              {order.archivedAt && <span><strong style={{ color: "#03033f" }}>Archived:</strong> {fmt(order.archivedAt)}</span>}
                            </div>
                            <table className="text-xs border-collapse" style={{ maxWidth: 500 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid #03033f14" }}>
                                  <th className="py-1 pr-6 text-left font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Item No</th>
                                  <th className="py-1 pr-6 text-left font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Product</th>
                                  <th className="py-1 text-left font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Cases</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item) => (
                                  <tr key={item.productId} style={{ borderBottom: "1px solid #03033f08" }}>
                                    <td className="py-1.5 pr-6 font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{item.itemNo}</td>
                                    <td className="py-1.5 pr-6" style={{ color: "#03033f" }}>{item.name}</td>
                                    <td className="py-1.5" style={{ color: "#03033f" }}>{item.qty}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {order.notes && (
                              <p className="text-xs" style={{ color: "#03033f88" }}>
                                <strong style={{ color: "#03033f" }}>Notes:</strong> {order.notes}
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
