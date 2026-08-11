"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { WebOrder } from "@/lib/orders-store";
import SignaturePad, { type SignaturePadHandle } from "@/components/SignaturePad";

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DriverOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const padRef = useRef<SignaturePadHandle>(null);

  const [order, setOrder] = useState<WebOrder | null | undefined>(undefined); // undefined = loading, null = not found
  const [signedByName, setSignedByName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/driver/orders/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setOrder);
  }, [id]);

  async function handleSubmit() {
    setError("");
    const dataUrl = padRef.current?.toDataUrl();
    if (!dataUrl) {
      setError("Please have the customer sign before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/driver/orders/${id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl: dataUrl, signedByName: signedByName.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Could not submit signature.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (order === undefined) {
    return <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66" }}>Loading…</div>;
  }

  if (order === null) {
    return (
      <div className="flex flex-col gap-4 items-center p-16 text-center bg-white" style={{ border: "1px solid #03033f14" }}>
        <p className="text-sm" style={{ color: "#03033f88" }}>
          This order isn&apos;t available to sign — it may already be delivered, or isn&apos;t a delivery order.
        </p>
        <Link href="/driver" className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f" }}>
          ← Back to Deliveries
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 items-center p-16 text-center bg-white" style={{ border: "1px solid #03033f14" }}>
        <p className="text-lg font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          Delivery Confirmed
        </p>
        <p className="text-sm" style={{ color: "#03033f88" }}>Signature saved for order #{order.id.slice(-6)}.</p>
        <Link
          href="/driver"
          className="px-6 py-3 font-bold text-sm tracking-widest uppercase transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
        >
          Next Delivery
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/driver" className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f88" }}>
        ← Back to Deliveries
      </Link>

      <div className="bg-white p-5 flex flex-col gap-4" style={{ border: "1px solid #03033f14" }}>
        <div>
          <div className="text-lg font-bold" style={{ color: "#03033f" }}>{order.customer.name}</div>
          {order.customer.company && <div className="text-sm" style={{ color: "#03033f88" }}>{order.customer.company}</div>}
          {order.address && <div className="text-sm mt-1" style={{ color: "#03033f88" }}>{order.address}</div>}
        </div>

        <div className="w-full h-px" style={{ backgroundColor: "#03033f0d" }} />

        <div className="flex flex-col gap-2">
          {order.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between gap-3 text-sm">
              <div style={{ color: "#03033f" }}>
                {item.name}
                <span style={{ color: "#03033f66" }}> · {item.qty} {item.qty === 1 ? "case" : "cases"}{item.totalWeight ? ` · ${item.totalWeight} ${item.weightUnit ?? "kg"}` : ""}</span>
              </div>
              {item.lineTotal != null && <div className="font-bold whitespace-nowrap" style={{ color: "#03033f" }}>{fmtMoney(item.lineTotal)}</div>}
            </div>
          ))}
        </div>

        {order.invoiceTotal != null && (
          <>
            <div className="w-full h-px" style={{ backgroundColor: "#03033f0d" }} />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Total</span>
              <span className="text-xl font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{fmtMoney(order.invoiceTotal)}</span>
            </div>
          </>
        )}

        {order.notes && <p className="text-xs" style={{ color: "#03033f88" }}><strong style={{ color: "#03033f" }}>Notes:</strong> {order.notes}</p>}
      </div>

      <div className="bg-white p-5 flex flex-col gap-4" style={{ border: "1px solid #03033f14" }}>
        <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          Customer Signature
        </p>
        <p className="text-sm" style={{ color: "#03033f88" }}>
          By signing, the customer acknowledges receipt of the items and total above.
        </p>

        <div style={{ height: 200, border: "1px dashed #03033f44", backgroundColor: "#fff" }}>
          <SignaturePad ref={padRef} />
        </div>
        <button
          type="button"
          onClick={() => padRef.current?.clear()}
          className="self-start text-xs font-bold tracking-widest uppercase hover:opacity-60"
          style={{ color: "#03033f88", fontFamily: "var(--font-brand), sans-serif" }}
        >
          Clear
        </button>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
            Printed Name <span style={{ color: "#03033f44" }}>(optional, helps if the signature is hard to read)</span>
          </label>
          <input
            type="text"
            value={signedByName}
            onChange={(e) => setSignedByName(e.target.value)}
            placeholder="Customer's name"
            className="px-3 py-2.5 text-base"
            style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          />
        </div>

        {error && (
          <div className="px-4 py-3 text-xs" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>{error}</div>
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="px-6 py-4 font-bold text-sm tracking-widest uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
        >
          {submitting ? "Saving…" : "Confirm Delivery"}
        </button>
      </div>
    </div>
  );
}
