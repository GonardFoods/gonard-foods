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
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function PenIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

type FormState = {
  name: string; company: string; email: string; phone: string; notes: string;
  fulfillment: "" | "pickup" | "delivery";
  street1: string; street2: string; city: string; province: string; postalCode: string; country: string;
};

export default function CheckoutPage() {
  const { items, itemCount, clearCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const [loggedInCustomer, setLoggedInCustomer] = useState<Record<string, string> | null>(null);
  const [customerLoaded, setCustomerLoaded] = useState(false);
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());

  const [form, setForm] = useState<FormState>({
    name: "", company: "", email: "", phone: "", notes: "",
    fulfillment: "",
    street1: "", street2: "", city: "", province: "", postalCode: "", country: "Canada",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    setMounted(true);
    fetch("/api/customer/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const c = data?.customer;
        if (c?.name) {
          setLoggedInCustomer(c);
          setForm((f) => ({
            ...f,
            name: c.name ?? "",
            email: c.email ?? "",
            phone: c.phone ?? "",
            company: c.company ?? "",
            street1: c.street1 ?? "",
            street2: c.street2 ?? "",
            city: c.city ?? "",
            province: c.province ?? "",
            postalCode: c.postalCode ?? "",
            country: c.country ?? "Canada",
          }));
        }
        setCustomerLoaded(true);
      })
      .catch(() => setCustomerLoaded(true));
  }, []);

  function set(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function touch(key: string) {
    return () => setTouched((t) => ({ ...t, [key]: true }));
  }

  function toggleEdit(field: string) {
    setEditingFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field); else next.add(field);
      return next;
    });
  }

  const isConfirmMode = loggedInCustomer !== null;
  const phoneError    = touched.phone      && !isValidPhone(form.phone);
  const fulfillError  = touched.fulfillment && !form.fulfillment;
  const addressError  = touched.street1    && form.fulfillment === "delivery" && !form.street1.trim();

  function buildAddressString() {
    return [form.street1, form.street2, form.city, form.province, form.postalCode, form.country]
      .filter(Boolean).join(", ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ phone: true, fulfillment: true, street1: true });
    if (!isValidPhone(form.phone)) return;
    if (!form.fulfillment) return;
    if (form.fulfillment === "delivery" && !form.street1.trim()) return;

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
            street1: form.street1 || undefined,
            street2: form.street2 || undefined,
            city: form.city || undefined,
            province: form.province || undefined,
            postalCode: form.postalCode || undefined,
            country: form.country || undefined,
          },
          fulfillment: form.fulfillment,
          address: form.fulfillment === "delivery" ? buildAddressString() : undefined,
          items: items.map((i) => ({ productId: i.productId, name: i.name, qty: i.quantity })),
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json() as { ok?: boolean; orderId?: string; error?: string };
      if (!res.ok) { setErrorMsg(data.error ?? "Something went wrong. Please try again."); setStatus("error"); return; }
      setOrderId(data.orderId ?? "");
      clearCart();
      setStatus("sent");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (!mounted || !customerLoaded) return null;

  if (status === "sent") {
    return (
      <>
        <section className="py-24 px-6 text-center" style={{ backgroundColor: "#03033f", backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
          <div className="max-w-3xl mx-auto">
            <p className="text-white/50 text-xs tracking-[0.35em] uppercase mb-4" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Order Submitted</p>
            <h1 className="text-white text-4xl font-bold tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Thank You</h1>
            <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
          </div>
        </section>
        <section className="py-24 px-6 bg-white text-center">
          <div className="max-w-md mx-auto flex flex-col items-center gap-6">
            <div className="w-10 h-0.5" style={{ backgroundColor: "#16a34a" }} />
            <h2 className="text-xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Order Received</h2>
            <p className="text-sm leading-relaxed" style={{ color: "#03033f99" }}>
              Your order inquiry has been submitted. We&apos;ll be in touch shortly to confirm availability and pricing.
            </p>
            {orderId && <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Reference: #{orderId}</p>}
            <p className="text-xs" style={{ color: "#03033f66" }}>A confirmation has been sent to {form.email}.</p>
            <Link href="/products" className="mt-4 px-8 py-3.5 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity" style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}>
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
        <section className="py-24 px-6 text-center" style={{ backgroundColor: "#03033f", backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
          <div className="max-w-3xl mx-auto">
            <h1 className="text-white text-4xl font-bold tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Checkout</h1>
            <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
          </div>
        </section>
        <section className="py-24 px-6 bg-white text-center">
          <div className="max-w-md mx-auto flex flex-col items-center gap-6">
            <p className="text-sm tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Your cart is empty</p>
            <Link href="/products" className="px-8 py-3.5 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity" style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}>
              Browse Products
            </Link>
          </div>
        </section>
      </>
    );
  }

  function ConfirmField({ fieldKey, label, type = "text", required = false, placeholder = "" }: {
    fieldKey: keyof FormState; label: string; type?: string; required?: boolean; placeholder?: string;
  }) {
    const editing = editingFields.has(fieldKey);
    const value = form[fieldKey] as string;
    return (
      <div className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: "1px solid #03033f08" }}>
        {editing ? (
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>{label}</label>
            <input type={type} required={required} placeholder={placeholder} value={value} onChange={set(fieldKey)} autoFocus className="px-3 py-2 text-sm w-full" style={inputStyle} />
          </div>
        ) : (
          <div className="flex-1">
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>{label}</p>
            <p className="text-sm mt-0.5" style={{ color: value ? "#03033f" : "#03033f44" }}>{value || <em>Not set</em>}</p>
          </div>
        )}
        <button type="button" onClick={() => toggleEdit(fieldKey)} className="shrink-0 p-1.5 rounded hover:bg-gray-100 transition-colors" style={{ color: editing ? "#03033f" : "#03033f55" }} title={editing ? "Done" : `Edit ${label}`}>
          {editing ? <span className="text-xs font-bold">✓</span> : <PenIcon />}
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="py-16 px-6 text-center" style={{ backgroundColor: "#03033f", backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-white/50 text-xs tracking-[0.35em] uppercase mb-4" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Almost Done</p>
          <h1 className="text-white text-4xl font-bold tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Place Your Order</h1>
          <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* Order summary */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold tracking-[0.12em] uppercase mb-5" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Order Summary</h2>
              <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: "#03033f" }} />
            </div>
            <div className="flex flex-col divide-y" style={{ borderTop: "1px solid #03033f0d", borderBottom: "1px solid #03033f0d" }}>
              {items.map((item) => (
                <div key={item.productId} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-snug" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{item.name}</p>
                    <p className="text-xs mt-0.5 uppercase tracking-widest" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>{item.unit}</p>
                  </div>
                  <span className="text-sm font-bold shrink-0" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{item.quantity} case{item.quantity !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#03033f55" }}>Pricing will be confirmed by our team after reviewing your order.</p>
            <Link href="/cart" className="text-xs font-bold tracking-widest uppercase underline hover:opacity-60 transition-opacity" style={{ color: "#03033f88", fontFamily: "var(--font-brand), sans-serif" }}>← Edit Cart</Link>
          </div>

          {/* Contact form / confirm screen */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold tracking-[0.12em] uppercase mb-5" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                {isConfirmMode ? "Confirm Your Information" : "Your Information"}
              </h2>
              <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: "#03033f" }} />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {isConfirmMode ? (
                <div className="flex flex-col">
                  <ConfirmField fieldKey="name"       label="Contact Name"      required placeholder="Jane Smith" />
                  <ConfirmField fieldKey="company"    label="Business Name"     required placeholder="The Grand Restaurant" />
                  <ConfirmField fieldKey="email"      label="Email"             type="email" required placeholder="jane@restaurant.com" />
                  <ConfirmField fieldKey="phone"      label="Phone"             type="tel"   required placeholder="(403) 555-0100" />
                  <ConfirmField fieldKey="street1"    label="Street Address"    required placeholder="123 Main St" />
                  <ConfirmField fieldKey="street2"    label="Suite / Unit"      placeholder="Unit 4B" />
                  <ConfirmField fieldKey="city"       label="City"              required placeholder="Calgary" />
                  <ConfirmField fieldKey="province"   label="Province / State"  required placeholder="AB" />
                  <ConfirmField fieldKey="postalCode" label="Postal Code"       required placeholder="T2P 1J9" />
                  <ConfirmField fieldKey="country"    label="Country"           required placeholder="Canada" />

                  {/* Fulfillment toggle */}
                  <div className="py-4" style={{ borderBottom: "1px solid #03033f08" }}>
                    <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Fulfillment Method *</p>
                    <div className="flex gap-3">
                      {(["pickup", "delivery"] as const).map((option) => {
                        const active = form.fulfillment === option;
                        return (
                          <button key={option} type="button"
                            onClick={() => { setForm((f) => ({ ...f, fulfillment: option })); setTouched((t) => ({ ...t, fulfillment: true })); }}
                            className="flex-1 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors"
                            style={{ fontFamily: "var(--font-brand), sans-serif", backgroundColor: active ? "#03033f" : "transparent", color: active ? "#fff" : "#03033f99", border: active ? "1px solid #03033f" : fulfillError ? "1px solid #dc2626" : "1px solid #03033f33" }}>
                            {option === "pickup" ? "Pick-Up" : "Delivery"}
                          </button>
                        );
                      })}
                    </div>
                    {fulfillError && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>Please select a fulfillment method.</p>}
                  </div>

                  <ConfirmField fieldKey="notes" label="Notes (optional)" placeholder="Special requests, etc." />
                </div>
              ) : (
                /* ── Guest mode ── */
                <>
                  {[
                    { key: "name",    label: "Contact Name *",   type: "text",     ph: "Jane Smith" },
                    { key: "company", label: "Business Name *",  type: "text",     ph: "The Grand Restaurant" },
                    { key: "email",   label: "Email *",          type: "email",    ph: "jane@restaurant.com" },
                    { key: "phone",   label: "Phone *",          type: "tel",      ph: "(403) 555-0100" },
                  ].map(({ key, label, type, ph }) => (
                    <div key={key} className="flex flex-col gap-2">
                      <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{label}</label>
                      <input type={type} required value={form[key as keyof FormState] as string}
                        onChange={set(key as keyof FormState)}
                        onBlur={key === "phone" ? touch("phone") : undefined}
                        className="px-4 py-3 text-sm"
                        style={key === "phone" && phoneError ? inputErrorStyle : inputStyle}
                        placeholder={ph} />
                      {key === "phone" && phoneError && <p className="text-xs" style={{ color: "#dc2626" }}>Please enter a valid phone number.</p>}
                    </div>
                  ))}

                  <div className="flex flex-col gap-3 pt-1">
                    <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Business Address</p>
                    {[
                      { key: "street1",    label: "Street Address *",        required: true,  ph: "123 Main St" },
                      { key: "street2",    label: "Suite / Unit (optional)", required: false, ph: "Unit 4B" },
                      { key: "city",       label: "City *",                  required: true,  ph: "Calgary" },
                      { key: "province",   label: "Province / State *",      required: true,  ph: "AB" },
                      { key: "postalCode", label: "Postal Code *",           required: true,  ph: "T2P 1J9" },
                      { key: "country",    label: "Country *",               required: true,  ph: "Canada" },
                    ].map(({ key, label, required, ph }) => (
                      <div key={key} className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{label}</label>
                        <input type="text" required={required} value={form[key as keyof FormState] as string}
                          onChange={set(key as keyof FormState)} className="px-4 py-3 text-sm" style={inputStyle} placeholder={ph} />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Fulfillment Method *</label>
                    <div className="flex gap-3">
                      {(["pickup", "delivery"] as const).map((option) => {
                        const active = form.fulfillment === option;
                        return (
                          <button key={option} type="button"
                            onClick={() => { setForm((f) => ({ ...f, fulfillment: option })); setTouched((t) => ({ ...t, fulfillment: true })); }}
                            className="flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-colors capitalize"
                            style={{ fontFamily: "var(--font-brand), sans-serif", backgroundColor: active ? "#03033f" : "transparent", color: active ? "#fff" : "#03033f99", border: active ? "1px solid #03033f" : fulfillError ? "1px solid #dc2626" : "1px solid #03033f33" }}>
                            {option === "pickup" ? "Pick-Up" : "Delivery"}
                          </button>
                        );
                      })}
                    </div>
                    {fulfillError && <p className="text-xs" style={{ color: "#dc2626" }}>Please select a fulfillment method.</p>}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Notes <span style={{ color: "#03033f55" }}>(optional)</span></label>
                    <textarea rows={3} value={form.notes} onChange={set("notes")} className="px-4 py-3 text-sm resize-none" style={inputStyle} placeholder="Special requests, preferred delivery window, etc." />
                  </div>
                </>
              )}

              {status === "error" && (
                <div className="px-4 py-3 text-xs leading-relaxed" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>{errorMsg}</div>
              )}

              <button type="submit" disabled={status === "sending"} className="px-8 py-4 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-50" style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}>
                {status === "sending" ? "Submitting…" : isConfirmMode ? "Confirm & Submit Order" : "Submit Order"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
