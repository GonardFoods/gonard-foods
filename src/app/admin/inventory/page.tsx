"use client";

import { useState, useEffect, useRef } from "react";

interface InventoryRow {
  itemNo: string;
  productId: string | null;
  name: string;
  category: string | null;
  onHand: number | null;
  updatedAt: string | null;
  pendingCases: number;
  available: number | null;
}

interface InventoryData {
  rows: InventoryRow[];
  lastImportAt: string | null;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export default function AdminInventory() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; updated?: number; error?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/admin/inventory/upload", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: text,
      });
      const json = await res.json();
      if (res.ok) {
        setUploadResult({ ok: true, updated: json.updated });
        await load();
      } else {
        setUploadResult({ ok: false, error: json.error ?? "Upload failed." });
      }
    } catch {
      setUploadResult({ ok: false, error: "Network error. Please try again." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const rows = data?.rows ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
            Inventory
          </h1>
          <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        </div>
        <div className="flex items-center gap-4">
          {data?.lastImportAt && (
            <span className="text-xs" style={{ color: "#03033f66" }}>
              Last import: {fmt(data.lastImportAt)}
            </span>
          )}
          <label
            className="px-4 py-2 text-xs font-bold tracking-widest uppercase cursor-pointer transition-opacity hover:opacity-70"
            style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif", opacity: uploading ? 0.5 : 1, pointerEvents: uploading ? "none" : "auto" }}
          >
            {uploading ? "Importing…" : "Import Sage CSV"}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Upload result */}
      {uploadResult && (
        <div
          className="px-4 py-3 text-xs leading-relaxed"
          style={{
            backgroundColor: uploadResult.ok ? "#dcfce7" : "#fef2f2",
            border: `1px solid ${uploadResult.ok ? "#bbf7d0" : "#fecaca"}`,
            color: uploadResult.ok ? "#166534" : "#dc2626",
          }}
        >
          {uploadResult.ok
            ? `Successfully imported ${uploadResult.updated} item${uploadResult.updated !== 1 ? "s" : ""}.`
            : uploadResult.error}
        </div>
      )}

      {/* CSV format hint */}
      <p className="text-xs leading-relaxed" style={{ color: "#03033f55" }}>
        Upload a Sage 50 inventory export CSV. The file should contain columns for Item Number and Quantity on Hand.
      </p>

      {/* Table */}
      <div className="bg-white overflow-x-auto">
        {loading ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>No inventory data. Import a Sage CSV to get started.</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid #03033f14" }}>
                {["Item No", "Product", "On Hand", "Pending Orders", "Available", "Updated"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isLow = row.available != null && row.available <= 5;
                const isOut = row.available != null && row.available <= 0;
                return (
                  <tr key={row.itemNo} style={{ borderBottom: "1px solid #03033f08" }} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-xs" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                      {row.itemNo}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold" style={{ color: "#03033f" }}>{row.name}</div>
                      {row.category && <div className="text-xs" style={{ color: "#03033f55" }}>{row.category}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: "#03033f" }}>
                      {row.onHand != null ? row.onHand : <span style={{ color: "#03033f33" }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: row.pendingCases > 0 ? "#854d0e" : "#03033f66" }}>
                      {row.pendingCases > 0 ? row.pendingCases : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.available != null ? (
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
                      ) : (
                        <span style={{ color: "#03033f33" }} className="text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#03033f55" }}>
                      {row.updatedAt ? fmt(row.updatedAt) : <span style={{ color: "#03033f33" }}>—</span>}
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
