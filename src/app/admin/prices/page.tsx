"use client";

import { useState, useEffect, useMemo } from "react";
import { products, CATEGORY_LABELS, getWeightUnit } from "@/data/products";
import type { PriceData } from "@/lib/prices";

interface Row {
  id: string;
  itemNo: string;
  name: string;
  category: string;
  unit: string;
  weightUnit: "KG" | "LB";
  pricePerUnit: number | null;
  caseWeight: number | null;
  saving: boolean;
  saved: boolean;
}

export default function AdminPricesPage() {
  const [rows, setRows] = useState<Row[]>(() =>
    products.map((p) => ({
      id: p.id,
      itemNo: p.itemNo,
      name: p.name,
      category: CATEGORY_LABELS[p.category],
      unit: p.unit,
      weightUnit: getWeightUnit(p.unit),
      pricePerUnit: null,
      caseWeight: null,
      saving: false,
      saved: false,
    }))
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/prices")
      .then((r) => r.json())
      .then((data: Record<string, PriceData>) => {
        setRows((prev) =>
          prev.map((row) => ({
            ...row,
            pricePerUnit: data[row.id]?.pricePerUnit ?? null,
            caseWeight: data[row.id]?.caseWeight ?? null,
          }))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function updateField(id: string, field: "pricePerUnit" | "caseWeight", value: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, [field]: value === "" ? null : parseFloat(value), saved: false }
          : row
      )
    );
  }

  async function saveRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, saving: true } : r)));

    await fetch(`/api/admin/prices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pricePerUnit: row.pricePerUnit, caseWeight: row.caseWeight }),
    });

    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, saving: false, saved: true } : r))
    );
    setTimeout(() => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, saved: false } : r)));
    }, 2000);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.itemNo.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <h1
            className="text-2xl font-bold tracking-[0.1em] uppercase"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Prices
          </h1>
          <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or item no."
          className="px-4 py-2.5 text-sm outline-none w-full sm:w-72"
          style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
        />
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "#03033f66" }}>
        Enter the estimated mean case weight and the price per {" "}
        <strong>KG or LB</strong> (whichever unit the product is priced in). The customer-facing product page will calculate estimated order weight and cost automatically.
      </p>

      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
          Loading prices…
        </p>
      ) : (
        <div className="bg-white overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid #03033f14" }}>
                {["Item No.", "Product", "Category", "Unit", "Case Weight", "Price / Unit", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-bold tracking-widest uppercase whitespace-nowrap"
                    style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 transition-colors"
                  style={{ borderBottom: "1px solid #03033f08" }}
                >
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: "#03033f66" }}>
                    {row.itemNo}
                  </td>
                  <td className="px-4 py-3 font-bold text-xs max-w-[200px]" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#03033f99" }}>
                    {row.category}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: "#03033f66" }}>
                    {row.unit}
                  </td>
                  {/* Case weight input */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={row.caseWeight ?? ""}
                        onChange={(e) => updateField(row.id, "caseWeight", e.target.value)}
                        placeholder="—"
                        className="w-20 px-2 py-1.5 text-xs text-right outline-none"
                        style={{ border: "1px solid #03033f22", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                      />
                      <span className="text-xs" style={{ color: "#03033f55" }}>{row.weightUnit}</span>
                    </div>
                  </td>
                  {/* Price per unit input */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs" style={{ color: "#03033f55" }}>$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={row.pricePerUnit ?? ""}
                        onChange={(e) => updateField(row.id, "pricePerUnit", e.target.value)}
                        placeholder="—"
                        className="w-20 px-2 py-1.5 text-xs text-right outline-none"
                        style={{ border: "1px solid #03033f22", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                      />
                      <span className="text-xs" style={{ color: "#03033f55" }}>/{row.weightUnit}</span>
                    </div>
                  </td>
                  {/* Save button */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => saveRow(row.id)}
                      disabled={row.saving}
                      className="px-3 py-1.5 text-xs font-bold tracking-widest uppercase transition-all"
                      style={{
                        backgroundColor: row.saved ? "#16a34a" : "#03033f",
                        color: "#ffffff",
                        fontFamily: "var(--font-brand), sans-serif",
                        opacity: row.saving ? 0.5 : 1,
                      }}
                    >
                      {row.saved ? "Saved ✓" : row.saving ? "…" : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center py-8 text-xs" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
              No products match your search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
