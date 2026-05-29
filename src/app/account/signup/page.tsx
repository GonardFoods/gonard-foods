"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputStyle = {
  border: "1px solid #03033f33",
  color: "#03033f",
  fontFamily: "var(--font-brand), sans-serif",
  outline: "none",
};

function Field({ label, type = "text", required = true, placeholder = "", value, onChange }: {
  label: string; type?: string; required?: boolean; placeholder?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{label}</label>
      <input
        type={type} required={required} value={value} onChange={onChange}
        className="px-4 py-3 text-sm" style={inputStyle} placeholder={placeholder}
      />
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "",
    street1: "", street2: "", city: "", province: "", postalCode: "", country: "Canada",
    password: "", confirm: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setErrorMsg("Passwords do not match."); setStatus("error"); return; }
    if (form.password.length < 8) { setErrorMsg("Password must be at least 8 characters."); setStatus("error"); return; }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/customer/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, company: form.company, email: form.email, phone: form.phone,
          street1: form.street1, street2: form.street2 || undefined,
          city: form.city, province: form.province, postalCode: form.postalCode, country: form.country,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Sign up failed. Please try again."); setStatus("error"); return; }
      router.push("/account");
      router.refresh();
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <>
      <section
        className="py-20 px-6 text-center"
        style={{ backgroundColor: "#03033f", backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-white/50 text-xs tracking-[0.35em] uppercase mb-4" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Customer Portal</p>
          <h1 className="text-white text-4xl font-bold tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Create Account</h1>
          <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-md mx-auto flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            <Field label="Contact Name *"    value={form.name}     onChange={set("name")}     placeholder="Jane Smith" />
            <Field label="Business Name *"   value={form.company}  onChange={set("company")}  placeholder="The Grand Restaurant" />
            <Field label="Email *"           value={form.email}    onChange={set("email")}    type="email" placeholder="jane@restaurant.com" />
            <Field label="Phone *"           value={form.phone}    onChange={set("phone")}    type="tel"   placeholder="(403) 555-0100" />

            <div className="pt-2">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Business Address</p>
              <div className="flex flex-col gap-4">
                <Field label="Street Address *"        value={form.street1}    onChange={set("street1")}    placeholder="123 Main St" />
                <Field label="Suite / Unit (optional)" value={form.street2}    onChange={set("street2")}    required={false} placeholder="Unit 4B" />
                <Field label="City *"                  value={form.city}       onChange={set("city")}       placeholder="Calgary" />
                <Field label="Province / State *"      value={form.province}   onChange={set("province")}   placeholder="AB" />
                <Field label="Postal Code *"           value={form.postalCode} onChange={set("postalCode")} placeholder="T2P 1J9" />
                <Field label="Country *"               value={form.country}    onChange={set("country")}    placeholder="Canada" />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Password</p>
              <div className="flex flex-col gap-4">
                <Field label="Password *"         value={form.password} onChange={set("password")} type="password" placeholder="Min. 8 characters" />
                <Field label="Confirm Password *" value={form.confirm}  onChange={set("confirm")}  type="password" placeholder="Re-enter password" />
              </div>
            </div>

            {status === "error" && (
              <div className="px-4 py-3 text-xs" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>{errorMsg}</div>
            )}

            <button
              type="submit" disabled={status === "submitting"}
              className="px-8 py-4 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}
            >
              {status === "submitting" ? "Creating Account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-xs" style={{ color: "#03033f66" }}>
            Already have an account?{" "}
            <Link href="/account/login" className="font-bold underline hover:opacity-60 transition-opacity" style={{ color: "#03033f" }}>
              Sign In
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
