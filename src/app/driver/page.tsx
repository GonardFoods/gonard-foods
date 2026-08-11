"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WebOrder } from "@/lib/orders-store";

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DriverOrderList() {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/driver/orders")
      .then((res) => (res.ok ? res.json() : []))
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          Deliveries
        </h1>
        <p className="text-sm mt-1" style={{ color: "#03033f88" }}>
          Tap an order to view it and collect a signature on delivery.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
          Loading…
        </div>
      ) : orders.length === 0 ? (
        <div className="p-16 text-center text-sm bg-white" style={{ color: "#03033f66" }}>
          No deliveries waiting right now.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/driver/orders/${order.id}`}
              className="bg-white p-5 flex flex-col gap-2 hover:shadow-md transition-shadow"
              style={{ border: "1px solid #03033f14" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-bold" style={{ color: "#03033f" }}>{order.customer.name}</div>
                  {order.customer.company && <div className="text-sm" style={{ color: "#03033f88" }}>{order.customer.company}</div>}
                </div>
                {order.invoiceTotal != null && (
                  <div className="text-base font-bold whitespace-nowrap" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                    {fmtMoney(order.invoiceTotal)}
                  </div>
                )}
              </div>
              {order.address && <div className="text-sm" style={{ color: "#03033f88" }}>{order.address}</div>}
              <div className="text-xs" style={{ color: "#03033f55" }}>
                {order.items.length} line{order.items.length !== 1 ? "s" : ""} · Order #{order.id.slice(-6)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
