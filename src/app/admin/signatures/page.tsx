"use client";

import { useEffect, useMemo, useState } from "react";
import type { WebOrder } from "@/lib/orders-store";
import type { Driver } from "@/lib/drivers-store";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SignaturesPage() {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/orders").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/drivers").then((r) => (r.ok ? r.json() : [])),
    ]).then(([o, d]) => {
      setOrders(o);
      setDrivers(d);
      setLoading(false);
    });
  }, []);

  const signed = useMemo(() => {
    const withSig = orders.filter((o) => o.proofOfDelivery);
    const q = search.trim().toLowerCase();
    const filtered = q
      ? withSig.filter((o) =>
          [o.customer.name, o.customer.company ?? "", o.id, o.proofOfDelivery?.signedByName ?? ""]
            .some((s) => s.toLowerCase().includes(q))
        )
      : withSig;
    return filtered.sort(
      (a, b) => new Date(b.proofOfDelivery!.signedAt).getTime() - new Date(a.proofOfDelivery!.signedAt).getTime()
    );
  }, [orders, search]);

  const driverName = (id?: string) => drivers.find((d) => d.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          Signatures
        </h1>
        <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        <p className="text-sm mt-4 max-w-xl" style={{ color: "#03033f88" }}>
          Every delivery signed for by a customer, with the matching invoice — for accounting and audit purposes.
        </p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by customer, company, or order #…"
        className="px-4 py-2.5 text-sm max-w-sm"
        style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif", outline: "none" }}
      />

      <div className="bg-white overflow-x-auto">
        {loading ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Loading…</div>
        ) : signed.length === 0 ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
            {search ? "No matches." : "No signed deliveries yet."}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid #03033f14" }}>
                {["Signature", "Order", "Customer", "Driver", "Signed", "Total", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signed.map((order) => {
                const pod = order.proofOfDelivery!;
                const isExpanded = expanded === order.id;
                return (
                  <>
                    <tr
                      key={order.id}
                      style={{ borderBottom: "1px solid #03033f08" }}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : order.id)}
                    >
                      <td className="px-4 py-3">
                        <a href={pod.signatureUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Open full-size signature">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={pod.signatureUrl} alt="Customer signature" style={{ height: 36, backgroundColor: "#fff", border: "1px solid #03033f14" }} />
                        </a>
                      </td>
                      <td className="px-4 py-3 font-bold text-xs" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>#{order.id.slice(-6)}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold" style={{ color: "#03033f" }}>{order.customer.name}</div>
                        {order.customer.company && <div className="text-xs" style={{ color: "#03033f66" }}>{order.customer.company}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}>{driverName(order.assignedDriverId)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#03033f88" }}>
                        {fmt(pod.signedAt)}
                        {pod.signedByName && <div style={{ color: "#03033f55" }}>{pod.signedByName}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: "#03033f" }}>
                        {order.invoiceTotal != null ? fmtMoney(order.invoiceTotal) : <span style={{ color: "#03033f33" }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#03033f66" }}>{isExpanded ? "Hide Invoice ▲" : "View Invoice ▼"}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${order.id}-detail`} style={{ backgroundColor: "#f8f8fb", borderBottom: "1px solid #03033f08" }}>
                        <td colSpan={7} className="px-6 py-4">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap gap-6 text-xs" style={{ color: "#03033f88" }}>
                              <span><strong style={{ color: "#03033f" }}>Email:</strong> <a href={`mailto:${order.customer.email}`} style={{ color: "#0284c7" }}>{order.customer.email}</a></span>
                              {order.address && <span><strong style={{ color: "#03033f" }}>Delivered To:</strong> {order.address}</span>}
                              {order.fulfilledAt && <span><strong style={{ color: "#03033f" }}>Marked Delivered:</strong> {fmt(order.fulfilledAt)}</span>}
                            </div>

                            <div className="overflow-x-auto">
                              <table className="text-xs border-collapse" style={{ minWidth: 600 }}>
                                <thead>
                                  <tr style={{ borderBottom: "1px solid #03033f14" }}>
                                    {["Item No", "Product", "Cases", "Weight", "Price", "Line Total"].map((h) => (
                                      <th key={h} className="py-1 pr-6 text-left font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item) => (
                                    <tr key={item.productId} style={{ borderBottom: "1px solid #03033f08" }}>
                                      <td className="py-1.5 pr-6 font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{item.itemNo}</td>
                                      <td className="py-1.5 pr-6" style={{ color: "#03033f" }}>{item.name}</td>
                                      <td className="py-1.5 pr-6" style={{ color: "#03033f" }}>{item.qty}</td>
                                      <td className="py-1.5 pr-6 text-xs" style={{ color: "#03033f66" }}>{item.totalWeight != null ? `${item.totalWeight} ${item.weightUnit ?? ""}` : "—"}</td>
                                      <td className="py-1.5 pr-6" style={{ color: "#03033f" }}>{item.pricePerUnit != null ? `$${item.pricePerUnit}` : "—"}</td>
                                      <td className="py-1.5 font-bold" style={{ color: "#03033f" }}>{item.lineTotal != null ? fmtMoney(item.lineTotal) : "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={pod.signatureUrl} alt="Customer signature, full size" style={{ height: 100, backgroundColor: "#fff", border: "1px solid #03033f14" }} />
                              <div className="text-xs" style={{ color: "#03033f88" }}>
                                Signed {fmt(pod.signedAt)}
                                {pod.signedByName && <> by <strong style={{ color: "#03033f" }}>{pod.signedByName}</strong></>}
                                {order.assignedDriverId && <> · Delivered by {driverName(order.assignedDriverId)}</>}
                              </div>
                            </div>
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
