"use client";

import { useRouter } from "next/navigation";

export default function SwitchDriverButton() {
  const router = useRouter();

  async function switchDriver() {
    await fetch("/api/driver/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    router.push("/driver");
    router.refresh();
  }

  return (
    <button
      onClick={switchDriver}
      className="text-white/60 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors"
      style={{ fontFamily: "var(--font-brand), sans-serif" }}
    >
      Switch Driver
    </button>
  );
}
