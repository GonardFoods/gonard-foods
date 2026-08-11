"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DriverPicker() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/driver/drivers")
      .then((res) => (res.ok ? res.json() : []))
      .then(setDrivers)
      .finally(() => setLoading(false));
  }, []);

  async function pick(driverId: string) {
    setSelecting(driverId);
    const res = await fetch("/api/driver/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setSelecting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          Who&apos;s Driving?
        </h1>
        <p className="text-sm mt-1" style={{ color: "#03033f88" }}>
          Tap your name to see your assigned deliveries.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
          Loading…
        </div>
      ) : drivers.length === 0 ? (
        <div className="p-16 text-center text-sm bg-white" style={{ color: "#03033f66" }}>
          No drivers have been set up yet. Ask the office to add drivers under Admin → Drivers.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {drivers.map((driver) => (
            <button
              key={driver.id}
              onClick={() => pick(driver.id)}
              disabled={selecting !== null}
              className="bg-white py-8 text-lg font-bold tracking-widest uppercase hover:opacity-70 transition-opacity disabled:opacity-40"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif", border: "1px solid #03033f14" }}
            >
              {selecting === driver.id ? "…" : driver.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
