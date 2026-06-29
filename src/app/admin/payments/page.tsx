"use client";

import { useState, useEffect } from "react";
import type { Payment } from "@/lib/payments-store";
import type { PublicCustomer } from "@/lib/customers-store";
import type { SageCustomer } from "@/lib/sage-customers-store";
import SearchableSelect, { type SelectOption } from "@/components/SearchableSelect";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}
function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const labelStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase",
  color: "#03033f66", fontFamily: "var(--font-brand), sans-serif",
};
const cellStyle: React.CSSProperties = { padding: "12px 14px", fontSize: "12px", color: "#03033f" };

export default function AdminPaymentsPage() {
  const [unmatched, setUnmatched] = useState<Payment[]>([]);
  const [all, setAll] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<PublicCustomer[]>([]);
  const [sageCustomers, setSageCustomers] = useState<SageCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState<Record<string, string>>({});
  const [markingSynced, setMarkingSynced] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [unmRes, allRes, custRes, sageRes] = await Promise.all([
        fetch("/api/admin/payments/unmatched"),
        fetch("/api/admin/payments"),
        fetch("/api/customers"),
        fetch("/api/admin/sage-customers"),
      ]);
      if (unmRes.ok) setUnmatched(await unmRes.json());
      if (allRes.ok) setAll(await allRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (sageRes.ok) setSageCustomers(await sageRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Build searchable option list: web customers first, then Sage-only
  function buildOptions(paymentId: string): SelectOption[] {
    const webOpts: SelectOption[] = customers.map((c) => ({
      value: "c:" + c.id,
      label: c.name,
      sublabel: c.company,
      group: "Customers with account",
    }));

    // Exclude Sage customers that already have a matching web account
    const webNames = new Set(customers.map((c) => (c.sageName || c.company || c.name).toLowerCase()));
    const sageOpts: SelectOption[] = sageCustomers
      .filter((sc) => !webNames.has(sc.name.toLowerCase()))
      .map((sc) => ({
        value: "s:" + sc.name,
        label: sc.name,
        group: "Sage only (no web account)",
      }));

    void paymentId; // used for keying — options are the same for all payments
    return [...webOpts, ...sageOpts];
  }

  async function assign(paymentId: string) {
    const raw = selectedCustomer[paymentId];
    if (!raw) return;
    setAssigning(paymentId);
    setError((prev) => ({ ...prev, [paymentId]: "" }));
    try {
      let body: object;
      if (raw.startsWith("c:")) {
        body = { paymentId, customerId: raw.slice(2) };
      } else {
        body = { paymentId, sageCustomerName: raw.slice(2) };
      }
      const res = await fetch("/api/admin/payments/unmatched", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError((prev) => ({ ...prev, [paymentId]: d.error ?? "Failed to assign." }));
      } else {
        await load();
      }
    } catch {
      setError((prev) => ({ ...prev, [paymentId]: "Network error." }));
    } finally {
      setAssigning(null);
    }
  }

  async function markSynced(paymentId: string) {
    setMarkingSynced(paymentId);
    try {
      await fetch(`/api/admin/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sageSynced: true }),
      });
      await load();
    } finally {
      setMarkingSynced(null);
    }
  }

  const matched = all.filter((p) => p.source !== "email_unmatched");

  function sourceLabel(source: string) {
    if (source === "email_auto") return "Auto (email)";
    if (source === "manual") return "Assigned";
    if (source === "manual_sage") return "Assigned (Sage only)";
    return source;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          Payments
        </h1>
        <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
      </div>

      {loading ? (
        <p style={labelStyle}>Loading…</p>
      ) : (
        <>
          {/* Unmatched e-Transfers */}
          {unmatched.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="px-3 py-1 text-xs font-bold tracking-widest uppercase"
                  style={{ backgroundColor: "#fee2e2", color: "#991b1b", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  Action Required — {unmatched.length} Unmatched E-Transfer{unmatched.length !== 1 ? "s" : ""}
                </div>
              </div>
              <p className="text-xs mb-4" style={{ color: "#03033f88", lineHeight: 1.6 }}>
                The agent received these Interac e-Transfers but could not confidently match the sender to a customer.
                Assign each one below — the dropdown includes both customers with a web account and Sage-only customers from your imported list.
                Assigning to a web account also adjusts their balance.
              </p>
              <div className="flex flex-col gap-3">
                {unmatched.map((p) => (
                  <div key={p.id} className="p-4" style={{ border: "2px solid #fca5a5", backgroundColor: "#fff5f5" }}>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        <p style={{ ...labelStyle, color: "#991b1b" }}>Sender Name (from email)</p>
                        <p className="text-base font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                          {p.customerName}
                        </p>
                        <p className="text-xs" style={{ color: "#03033f88" }}>
                          {fmtMoney(p.amount)} &bull; {fmt(p.receivedAt)}
                        </p>
                        {p.note && (
                          <p className="text-xs mt-1" style={{ color: "#03033f66" }}>{p.note}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[280px]">
                        <p style={labelStyle}>Assign to customer</p>
                        <SearchableSelect
                          options={buildOptions(p.id)}
                          value={selectedCustomer[p.id] ?? ""}
                          onChange={(val) => setSelectedCustomer((prev) => ({ ...prev, [p.id]: val }))}
                          placeholder="— Select customer —"
                        />
                        {error[p.id] && (
                          <p className="text-xs" style={{ color: "#991b1b" }}>{error[p.id]}</p>
                        )}
                        <button
                          onClick={() => assign(p.id)}
                          disabled={!selectedCustomer[p.id] || assigning === p.id}
                          style={{
                            padding: "9px 18px",
                            backgroundColor: selectedCustomer[p.id] ? "#03033f" : "#03033f33",
                            color: "#fff",
                            border: "none",
                            cursor: selectedCustomer[p.id] ? "pointer" : "default",
                            fontSize: "10px",
                            fontWeight: "bold",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            fontFamily: "var(--font-brand), sans-serif",
                          }}
                        >
                          {assigning === p.id ? "Assigning…" : "Assign & Apply"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unmatched.length === 0 && (
            <div className="p-4" style={{ backgroundColor: "#dcfce7", border: "1px solid #bbf7d0" }}>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#166534", fontFamily: "var(--font-brand), sans-serif" }}>
                No unmatched e-transfers
              </span>
            </div>
          )}

          {/* Payment History */}
          <div>
            <h2 className="text-lg font-bold tracking-[0.1em] uppercase mb-3" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
              Payment History
            </h2>
            <div className="w-8 h-0.5 mb-4" style={{ backgroundColor: "#03033f" }} />
            {matched.length === 0 ? (
              <p className="text-xs" style={{ color: "#03033f55" }}>No payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ borderBottom: "2px solid #03033f14" }}>
                      {["Date", "Customer", "Amount", "Source", "Balance Before", "Balance After", "Sage", ""].map((h) => (
                        <th key={h} className="px-3 py-3 text-left" style={{ ...labelStyle, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matched.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #03033f08" }}>
                        <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{fmt(p.receivedAt)}</td>
                        <td style={cellStyle}>{p.customerName}</td>
                        <td style={{ ...cellStyle, fontWeight: "bold", color: "#166534" }}>{fmtMoney(p.amount)}</td>
                        <td style={{ ...cellStyle, color: "#03033f66" }}>{sourceLabel(p.source)}</td>
                        <td style={{ ...cellStyle, color: "#03033f66" }}>{p.balanceBefore != null ? fmtMoney(p.balanceBefore) : "—"}</td>
                        <td style={{ ...cellStyle, color: "#03033f66" }}>{p.balanceAfter != null ? fmtMoney(p.balanceAfter) : "—"}</td>
                        <td style={cellStyle}>
                          <span
                            className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase"
                            style={{
                              backgroundColor: p.sageSynced ? "#dcfce7" : "#fef9c3",
                              color: p.sageSynced ? "#166534" : "#854d0e",
                              fontFamily: "var(--font-brand), sans-serif",
                            }}
                          >
                            {p.sageSynced ? "Synced" : "Pending"}
                          </span>
                        </td>
                        <td style={cellStyle}>
                          {!p.sageSynced && (
                            <button
                              onClick={() => markSynced(p.id)}
                              disabled={markingSynced === p.id}
                              style={{
                                padding: "4px 10px",
                                backgroundColor: "transparent",
                                color: "#03033f88",
                                border: "1px solid #03033f33",
                                cursor: "pointer",
                                fontSize: "10px",
                                fontWeight: "bold",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                fontFamily: "var(--font-brand), sans-serif",
                                whiteSpace: "nowrap",
                              }}
                              title="Mark as manually entered in Sage"
                            >
                              {markingSynced === p.id ? "…" : "Mark Synced"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
