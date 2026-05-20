"use client";

import { useState, useEffect } from "react";

interface InventoryRow {
  itemNo: string;
  productId: string | null;
  name: string;
  category: string | null;
  inHouse: number;
  onTheWay: number;
  reserved: number;
  available: number;
}

type FilterKey = "all" | "available" | "inHouse" | "onTheWay" | "reserved";

export default function AdminInventory() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/inventory")
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalAll       = rows.length;
  const totalAvailable = rows.reduce((s, r) => s + r.available, 0);
  const totalInHouse   = rows.reduce((s, r) => s + r.inHouse, 0);
  const totalOnTheWay  = rows.reduce((s, r) => s + r.onTheWay, 0);
  const totalReserved  = rows.reduce((s, r) => s + r.reserved, 0);

  const cards: { key: FilterKey; label: string; value: number; color: string; bg: string; activeBorder: string }[] = [
    { key: "all",      label: "All Products", value: totalAll,       color: "#03033f", bg: "#f8f8fb", activeBorder: "#03033f" },
    { key: "available",label: "Available",    value: totalAvailable, color: "#166534", bg: "#dcfce7", activeBorder: "#16a34a" },
    { key: "inHouse",  label: "In House",     value: totalInHouse,   color: "#03033f", bg: "#f0f4ff", activeBorder: "#03033f" },
    { key: "onTheWay", label: "On the Way",   value: totalOnTheWay,  color: "#854d0e", bg: "#fef9c3", activeBorder: "#ca8a04" },
    { key: "reserved", label: "Reserved",     value: totalReserved,  color: "#7c3aed", bg: "#f5f3ff", activeBorder: "#7c3aed" },
  ];

  const filtered = rows.filter((r) => {
    if (filter === "all")      return true;
    if (filter === "available") return r.available > 0;
    if (filter === "inHouse")  return r.inHouse > 0;
    if (filter === "onTheWay") return r.onTheWay > 0;
    if (filter === "reserved") return r.reserved > 0;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          Inventory
        </h1>
        <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
      </div>

      {/* Summary cards — double as filter buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => {
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className="p-5 flex flex-col gap-1 text-left transition-shadow hover:shadow-md"
              style={{
                backgroundColor: c.bg,
                border: active ? `2px solid ${c.activeBorder}` : "1px solid rgba(0,0,0,0.06)",
                outline: "none",
              }}
            >
              <span className="text-3xl font-bold" style={{ color: c.color, fontFamily: "var(--font-brand), sans-serif" }}>{c.value}</span>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: c.color + "aa", fontFamily: "var(--font-brand), sans-serif" }}>{c.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "#03033f55" }}>
        <strong style={{ color: "#03033f77" }}>In House</strong> = received supplier orders minus delivered customer orders. &nbsp;
        <strong style={{ color: "#03033f77" }}>Reserved</strong> = boxes committed to pending customer orders. &nbsp;
        <strong style={{ color: "#03033f77" }}>Available</strong> = In House minus Reserved.
      </p>

      {/* Table */}
      <div className="bg-white overflow-x-auto">
        {loading ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
            {rows.length === 0 ? "No data yet. Add supplier orders to track inventory." : "No products match this filter."}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid #03033f14" }}>
                {["Product", "In House", "On the Way", "Reserved", "Available"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const isLow = row.available > 0 && row.available <= 5;
                const isOut = row.available === 0 && row.inHouse > 0;
                const hasAny = row.inHouse > 0 || row.onTheWay > 0 || row.reserved > 0;
                return (
                  <tr key={row.itemNo} style={{ borderBottom: "1px solid #03033f08", opacity: hasAny ? 1 : 0.45 }} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold" style={{ color: "#03033f" }}>{row.name}</div>
                      {row.category && <div className="text-xs" style={{ color: "#03033f55" }}>{row.category}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: "#03033f" }}>
                      {row.inHouse}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: row.onTheWay > 0 ? "#854d0e" : "#03033f44" }}>
                      {row.onTheWay > 0 ? row.onTheWay : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: row.reserved > 0 ? "#7c3aed" : "#03033f44" }}>
                      {row.reserved > 0 ? row.reserved : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 text-xs font-bold"
                        style={{
                          backgroundColor: isOut ? "#fee2e2" : isLow ? "#fef9c3" : "#dcfce7",
                          color: isOut ? "#991b1b" : isLow ? "#854d0e" : "#166534",
                          fontFamily: "var(--font-brand), sans-serif",
                        }}
                      >
                        {row.available}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
