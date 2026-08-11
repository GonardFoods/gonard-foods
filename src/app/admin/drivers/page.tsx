"use client";

import { useEffect, useState } from "react";
import type { Driver } from "@/lib/drivers-store";

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#03033f99",
  fontFamily: "var(--font-brand), sans-serif",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 20px",
  backgroundColor: "#03033f",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  fontFamily: "var(--font-brand), sans-serif",
};

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/drivers");
    setDrivers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addDriver(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    await fetch("/api/admin/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    setAdding(false);
    load();
  }

  async function toggleActive(driver: Driver) {
    setDrivers((prev) => prev.map((d) => d.id === driver.id ? { ...d, active: !d.active } : d));
    await fetch(`/api/admin/drivers/${driver.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !driver.active }),
    });
  }

  async function renameDriver(id: string, name: string) {
    setDrivers((prev) => prev.map((d) => d.id === id ? { ...d, name } : d));
    await fetch(`/api/admin/drivers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function del(id: string) {
    await fetch(`/api/admin/drivers/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    load();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          Drivers
        </h1>
        <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        <p className="text-sm mt-4 max-w-xl" style={{ color: "#03033f88" }}>
          Drivers listed here appear as name buttons in the delivery app (gonardfoods.com/driver-login).
          Assign orders to a driver from the Customer Orders page — only their assigned deliveries show up for signing.
        </p>
      </div>

      <form onSubmit={addDriver} className="flex gap-3 items-end bg-white p-5" style={{ border: "1px solid #03033f14" }}>
        <div className="flex flex-col gap-2 flex-1 max-w-xs">
          <label style={labelStyle}>Driver Name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Mike Chen"
            style={{ padding: "9px 12px", border: "1px solid #03033f22", outline: "none", fontSize: "13px", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          />
        </div>
        <button type="submit" disabled={adding || !newName.trim()} style={{ ...btnPrimary, opacity: adding || !newName.trim() ? 0.5 : 1 }}>
          {adding ? "Adding…" : "+ Add Driver"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm" style={{ color: "#03033f66" }}>Loading…</p>
      ) : drivers.length === 0 ? (
        <div className="bg-white p-16 text-center" style={{ border: "1px solid #03033f0d" }}>
          <p className="text-sm" style={{ color: "#03033f66" }}>No drivers yet. Add one above to get started.</p>
        </div>
      ) : (
        <div className="bg-white" style={{ border: "1px solid #03033f0d" }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid #03033f14" }}>
                {["Name", "Active", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.id} style={{ borderBottom: "1px solid #03033f08" }}>
                  <td className="px-5 py-3">
                    <input
                      defaultValue={driver.name}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== driver.name && renameDriver(driver.id, e.target.value.trim())}
                      style={{ border: "none", outline: "none", fontSize: "13px", color: "#03033f", fontFamily: "var(--font-brand), sans-serif", width: "100%", background: "transparent" }}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(driver)}
                      className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase"
                      style={{
                        backgroundColor: driver.active ? "#dcfce7" : "#f1f5f9",
                        color: driver.active ? "#166534" : "#475569",
                        fontFamily: "var(--font-brand), sans-serif",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {driver.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setConfirmDelete(driver.id)}
                      className="text-xs font-bold tracking-widest uppercase hover:underline"
                      style={{ color: "#dc2626", fontFamily: "var(--font-brand), sans-serif", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white p-8 w-full max-w-sm flex flex-col gap-6">
            <div>
              <p className="font-bold text-sm tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                Remove Driver?
              </p>
              <p className="text-xs mt-2" style={{ color: "#03033f77" }}>
                Orders already assigned to them will keep the assignment but won&apos;t show up for anyone to sign. Reassign those first if needed.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => del(confirmDelete)} style={{ ...btnPrimary, flex: 1, padding: "10px 0", backgroundColor: "#dc2626" }}>Delete</button>
              <button onClick={() => setConfirmDelete(null)} style={{ ...btnPrimary, flex: 1, padding: "10px 0", backgroundColor: "transparent", color: "#03033f", border: "1px solid #03033f22" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
