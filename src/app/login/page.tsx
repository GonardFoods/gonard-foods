"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Invalid username or password.");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        backgroundColor: "#03033f",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="w-full max-w-sm bg-white p-10 flex flex-col gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 relative">
            <Image src="/logo.svg" alt="Gonard Foods" fill className="object-contain" />
          </div>
          <div className="text-center">
            <h1
              className="text-sm font-bold tracking-[0.2em] uppercase"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Gonard Foods
            </h1>
            <p
              className="text-xs tracking-widest uppercase mt-1"
              style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Admin Sign In
            </p>
          </div>
        </div>

        <div className="w-full h-px" style={{ backgroundColor: "#03033f0d" }} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="username"
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="px-4 py-3 text-sm outline-none focus:ring-2"
              style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="px-4 py-3 text-sm outline-none focus:ring-2"
              style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            />
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: "#dc2626", fontFamily: "var(--font-brand), sans-serif" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 font-bold text-sm tracking-widest uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}
          >
            {loading ? "Signing In…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
