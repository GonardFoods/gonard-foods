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

export default function AdminInventory() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/inventory")
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalAvailable = rows.reduce((s, r) => s + r.available, 0);
  const totalInHouse   = rows.reduce((s, r) => s + r.inHouse, 0);
  const totalOnTheWay  = rows.reduce((s, r) => s + r.onTheWay, 0);
  const totalReserved  = rows.reduce((s, r) => s + r.reserved, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          Inventory
        </h1>
        <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Available",   value: totalAvailable, color: "#166534", bg: "#dcfce7" },
          { label: "In House",    value: totalInHouse,   color: "#03033f", bg: "#f8f8fb" },
          { label: "On the Way",  value: totalOnTheWay,  color: "#854d0e", bg: "#fef9c3" },
          { label: "Reserved",    value: totalReserved,  color: "#7c3aed", bg: "#f5f3ff" },
        ].map((s) => (
          <div key={s.label} className="p-5 flex flex-col gap-1" style={{ backgroundColor: s.bg, border: "1px solid rgba(0,0,0,0.06)" }}>
            <span className="text-3xl font-bold" style={{ color: s.color, fontFamily: "var(--font-brand), sans-serif" }}>{s.value}</span>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: s.color + "aa", fontFamily: "var(--font-brand), sans-serif" }}>{s.label}</span>
          </div>
        ))}
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
        ) : rows.length === 0 ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
            No data yet. Add supplier orders to track inventory.
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
              {rows.map((row) => {
                const isLow  = row.available > 0 && row.available <= 5;
                const isOut  = row.available === 0 && row.inHouse > 0;
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
