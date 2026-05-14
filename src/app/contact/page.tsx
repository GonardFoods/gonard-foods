"use client";

import { useState } from "react";

const inputStyle = {
  border: "1px solid #03033f33",
  color: "#03033f",
  fontFamily: "var(--font-brand), sans-serif",
  outline: "none",
};

export default function Contact() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("sent");
      setForm({ firstName: "", lastName: "", email: "", company: "", message: "" });
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <>
      {/* Page header */}
      <section
        className="py-24 px-6 text-center"
        style={{
          backgroundColor: "#03033f",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-white/50 text-xs tracking-[0.35em] uppercase mb-4"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            Reach Out
          </p>
          <h1
            className="text-white text-4xl sm:text-5xl font-bold tracking-[0.12em] uppercase"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            Contact Us
          </h1>
          <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
        </div>
      </section>

      {/* Contact content */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* Contact info */}
          <div className="flex flex-col gap-10">
            <div>
              <h2
                className="text-xl font-bold tracking-[0.12em] uppercase mb-5"
                style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
              >
                Get in Touch
              </h2>
              <div className="w-10 h-0.5 mb-8" style={{ backgroundColor: "#03033f" }} />
              <p className="text-sm leading-relaxed" style={{ color: "#03033f99" }}>
                For wholesale account inquiries, order questions, or general information, reach out and we&apos;ll get back to you promptly.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {[
                { label: "Phone", value: "(403) 277-0991", href: "tel:4032770991" },
                { label: "Email", value: "gfoods@telus.net", href: "mailto:gfoods@telus.net" },
                { label: "Address", value: "3915 Edmonton Trl #7, Calgary, AB T2E 6T1", href: null },
                { label: "Hours", value: "Mon–Fri, 8 AM – 4 PM", href: null },
                { label: "Delivery Areas", value: "Calgary, Greater Calgary & Edmonton", href: null },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1">
                  <span
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}
                  >
                    {item.label}
                  </span>
                  {item.href ? (
                    <a href={item.href} className="text-sm hover:opacity-70 transition-opacity" style={{ color: "#03033f" }}>
                      {item.value}
                    </a>
                  ) : (
                    <span className="text-sm" style={{ color: "#03033f" }}>{item.value}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="p-6" style={{ backgroundColor: "#f8f8fb", border: "1px solid #03033f0d" }}>
              <h3
                className="text-xs font-bold tracking-widest uppercase mb-3"
                style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
              >
                Wholesale Accounts
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#03033f99" }}>
                Restaurants and businesses interested in a wholesale account should mention their business name and estimated monthly volume when reaching out. Custom pricing is available.
              </p>
            </div>
          </div>

          {/* Contact form */}
          <div>
            <h2
              className="text-xl font-bold tracking-[0.12em] uppercase mb-5"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Send a Message
            </h2>
            <div className="w-10 h-0.5 mb-8" style={{ backgroundColor: "#03033f" }} />

            {status === "sent" ? (
              <div className="flex flex-col gap-4 py-12 items-start">
                <div className="w-10 h-0.5" style={{ backgroundColor: "#16a34a" }} />
                <h3
                  className="text-lg font-bold tracking-[0.1em] uppercase"
                  style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  Message Sent
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#03033f99" }}>
                  Thank you for reaching out. We&apos;ll get back to you as soon as possible.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-4 text-xs font-bold tracking-widest uppercase underline transition-opacity hover:opacity-70"
                  style={{ color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="firstName" className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                      First Name *
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={form.firstName}
                      onChange={set("firstName")}
                      className="px-4 py-3 text-sm"
                      style={inputStyle}
                      placeholder="Jane"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="lastName" className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={set("lastName")}
                      className="px-4 py-3 text-sm"
                      style={inputStyle}
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                    Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={set("email")}
                    className="px-4 py-3 text-sm"
                    style={inputStyle}
                    placeholder="jane@restaurant.com"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="company" className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                    Company / Business <span style={{ color: "#03033f66" }}>(optional)</span>
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={form.company}
                    onChange={set("company")}
                    className="px-4 py-3 text-sm"
                    style={inputStyle}
                    placeholder="The Grand Restaurant"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="message" className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                    Message *
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    value={form.message}
                    onChange={set("message")}
                    className="px-4 py-3 text-sm resize-none"
                    style={inputStyle}
                    placeholder="Tell us what you're looking for..."
                  />
                </div>

                {status === "error" && (
                  <div className="px-4 py-3 text-xs leading-relaxed" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="px-8 py-3.5 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity duration-200 mt-2 disabled:opacity-50"
                  style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  {status === "sending" ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
