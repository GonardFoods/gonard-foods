"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";

const inputStyle = {
  border: "1px solid #03033f33",
  color: "#03033f",
  fontFamily: "var(--font-brand), sans-serif",
  outline: "none",
};

const inputErrorStyle = {
  ...inputStyle,
  border: "1px solid #dc2626",
};

function isValidPhone(value: string): boolean {
  // Strip all non-digit characters then check for 10–15 digits
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export default function CheckoutPage() {
  const { items, itemCount, clearCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "", notes: "",
    fulfillment: "" as "" | "pickup" | "delivery",
    address: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderId, setOrderId] = useState("");

  useEffect(() => { setMounted(true); }, []);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function touch(key: string) {
    return () => setTouched((t) => ({ ...t, [key]: true }));
  }

  const phoneError   = touched.phone      && !isValidPhone(form.phone);
  const fulfillError = touched.fulfillment && !form.fulfillment;
  const addressError = touched.address    && form.fulfillment === "delivery" && !form.address.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Force-touch all validated fields so errors show on submit
    setTouched({ phone: true, fulfillment: true, address: true });

    if (!isValidPhone(form.phone)) return;
    if (!form.fulfillment) return;
    if (form.fulfillment === "delivery" && !form.address.trim()) return;

    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: form.name,
            company: form.company || undefined,
            email: form.email,
            phone: form.phone,
          },
          fulfillment: form.fulfillment,
          address: form.fulfillment === "delivery" ? form.address : undefined,
          items: items.map((i) => ({ productId: i.productId, name: i.name, qty: i.quantity })),
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json() as { ok?: boolean; orderId?: string; error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setOrderId(data.orderId ?? "");
      clearCart();
      setStatus("sent");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (!mounted) return null;

  if (status === "sent") {
    return (
      <>
        <section
          className="py-24 px-6 text-center"
          style={{
            backgroundColor: "#03033f",
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          <div className="max-w-3xl mx-auto">
            <p className="text-white/50 text-xs tracking-[0.35em] uppercase mb-4" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
              Order Submitted
            </p>
            <h1 className="text-white text-4xl font-bold tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
              Thank You
            </h1>
            <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
          </div>
        </section>
        <section className="py-24 px-6 bg-white text-center">
          <div className="max-w-md mx-auto flex flex-col items-center gap-6">
            <div className="w-10 h-0.5" style={{ backgroundColor: "#16a34a" }} />
            <h2 className="text-xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
              Order Received
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#03033f99" }}>
              Your order inquiry has been submitted. We&apos;ll be in touch shortly to confirm availability and pricing.
            </p>
            {orderId && (
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
                Reference: #{orderId}
              </p>
            )}
            <p className="text-xs" style={{ color: "#03033f66" }}>
              A confirmation has been sent to {form.email}.
            </p>
            <Link
              href="/products"
              className="mt-4 px-8 py-3.5 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Continue Shopping
            </Link>
          </div>
        </section>
      </>
    );
  }

  if (itemCount === 0) {
    return (
      <>
        <section
          className="py-24 px-6 text-center"
          style={{
            backgroundColor: "#03033f",
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          <div className="max-w-3xl mx-auto">
            <h1 className="text-white text-4xl font-bold tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
              Checkout
            </h1>
            <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
          </div>
        </section>
        <section className="py-24 px-6 bg-white text-center">
          <div className="max-w-md mx-auto flex flex-col items-center gap-6">
            <p className="text-sm tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
              Your cart is empty
            </p>
            <Link
              href="/products"
              className="px-8 py-3.5 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Browse Products
            </Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section
        className="py-16 px-6 text-center"
        style={{
          backgroundColor: "#03033f",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-white/50 text-xs tracking-[0.35em] uppercase mb-4" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
            Almost Done
          </p>
          <h1 className="text-white text-4xl font-bold tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
            Place Your Order
          </h1>
          <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* Order summary */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold tracking-[0.12em] uppercase mb-5" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                Order Summary
              </h2>
              <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: "#03033f" }} />
            </div>

            <div className="flex flex-col divide-y" style={{ borderTop: "1px solid #03033f0d", borderBottom: "1px solid #03033f0d" }}>
              {items.map((item) => (
                <div key={item.productId} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-snug" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                      {item.name}
                    </p>
                    <p className="text-xs mt-0.5 uppercase tracking-widest" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
                      {item.unit}
                    </p>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                    {item.quantity} case{item.quantity !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs leading-relaxed" style={{ color: "#03033f55" }}>
              Pricing will be confirmed by our team after reviewing your order.
            </p>

            <Link href="/cart" className="text-xs font-bold tracking-widest uppercase underline hover:opacity-60 transition-opacity" style={{ color: "#03033f88", fontFamily: "var(--font-brand), sans-serif" }}>
              ← Edit Cart
            </Link>
          </div>

          {/* Contact form */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold tracking-[0.12em] uppercase mb-5" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                Your Information
              </h2>
              <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: "#03033f" }} />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                  Full Name *
                </label>
                <input type="text" required value={form.name} onChange={set("name")} className="px-4 py-3 text-sm" style={inputStyle} placeholder="Jane Smith" />
              </div>

              {/* Company */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                  Company / Business <span style={{ color: "#03033f55" }}>(optional)</span>
                </label>
                <input type="text" value={form.company} onChange={set("company")} className="px-4 py-3 text-sm" style={inputStyle} placeholder="The Grand Restaurant" />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                  Email *
                </label>
                <input type="email" required value={form.email} onChange={set("email")} className="px-4 py-3 text-sm" style={inputStyle} placeholder="jane@restaurant.com" />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={set("phone")}
                  onBlur={touch("phone")}
                  className="px-4 py-3 text-sm"
                  style={phoneError ? inputErrorStyle : inputStyle}
                  placeholder="(403) 555-0100"
                />
                {phoneError && (
                  <p className="text-xs" style={{ color: "#dc2626" }}>Please enter a valid phone number.</p>
                )}
              </div>

              {/* Fulfillment */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                  Fulfillment Method *
                </label>
                <div className="flex gap-3">
                  {(["pickup", "delivery"] as const).map((option) => {
                    const active = form.fulfillment === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => { setForm((f) => ({ ...f, fulfillment: option })); setTouched((t) => ({ ...t, fulfillment: true })); }}
                        className="flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-colors capitalize"
                        style={{
                          fontFamily: "var(--font-brand), sans-serif",
                          backgroundColor: active ? "#03033f" : "transparent",
                          color: active ? "#fff" : "#03033f99",
                          border: active ? "1px solid #03033f" : fulfillError ? "1px solid #dc2626" : "1px solid #03033f33",
                        }}
                      >
                        {option === "pickup" ? "Pick-Up" : "Delivery"}
                      </button>
                    );
                  })}
                </div>
                {fulfillError && (
                  <p className="text-xs" style={{ color: "#dc2626" }}>Please select a fulfillment method.</p>
                )}
              </div>

              {/* Delivery address — only shown when delivery is selected */}
              {form.fulfillment === "delivery" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                    Delivery Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={set("address")}
                    onBlur={touch("address")}
                    className="px-4 py-3 text-sm"
                    style={addressError ? inputErrorStyle : inputStyle}
                    placeholder="123 Main St, Calgary, AB T2P 1J9"
                  />
                  {addressError && (
                    <p className="text-xs" style={{ color: "#dc2626" }}>Please enter a delivery address.</p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                  Notes <span style={{ color: "#03033f55" }}>(optional)</span>
                </label>
                <textarea rows={3} value={form.notes} onChange={set("notes")} className="px-4 py-3 text-sm resize-none" style={inputStyle} placeholder="Special requests, preferred delivery window, etc." />
              </div>

              {status === "error" && (
                <div className="px-4 py-3 text-xs leading-relaxed" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="px-8 py-4 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}
              >
                {status === "sending" ? "Submitting…" : "Submit Order"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
