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

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error ?? "Sign in failed."); setStatus("error"); return; }
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
          <h1 className="text-white text-4xl font-bold tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Sign In</h1>
          <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-md mx-auto flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Email *</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="px-4 py-3 text-sm" style={inputStyle} placeholder="jane@restaurant.com" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Password *</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="px-4 py-3 text-sm" style={inputStyle} placeholder="Your password" />
            </div>

            {status === "error" && (
              <div className="px-4 py-3 text-xs" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>{errorMsg}</div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="px-8 py-4 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}
            >
              {status === "submitting" ? "Signing In…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs" style={{ color: "#03033f66" }}>
            Don&apos;t have an account?{" "}
            <Link href="/account/signup" className="font-bold underline hover:opacity-60 transition-opacity" style={{ color: "#03033f" }}>
              Sign Up
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
