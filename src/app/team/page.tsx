import type { Metadata } from "next";
import Link from "next/link";
import { getTeam } from "@/lib/team-store";

export const metadata: Metadata = {
  title: "Our Team | Gonard Foods",
  description: "Meet the people behind Gonard Foods — Calgary's trusted wholesale meat supplier.",
};

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const members = await getTeam();

  return (
    <>
      {/* Hero */}
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
            The People Behind It
          </p>
          <h1
            className="text-white text-4xl sm:text-5xl font-bold tracking-[0.12em] uppercase"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            Our Team
          </h1>
          <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
        </div>
      </section>

      {/* Team grid */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          {members.length === 0 ? (
            <p
              className="text-center text-sm"
              style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Coming soon.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-14">
              {members.map((m) => (
                <div key={m.id} className="flex flex-col gap-5">
                  <div
                    className="relative w-full overflow-hidden"
                    style={{ paddingBottom: "120%" }}
                  >
                    {m.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photoUrl} alt={m.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: "#f8f8fb" }}
                      >
                        <svg
                          width="52"
                          height="52"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          style={{ color: "#03033f18" }}
                        >
                          <circle cx="12" cy="8" r="5" />
                          <path d="M3 21c0-5 4-9 9-9s9 4 9 9" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p
                      className="font-bold text-sm tracking-widest uppercase"
                      style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                    >
                      {m.name}
                    </p>
                    <div className="w-6 h-px mt-0.5" style={{ backgroundColor: "#03033f33" }} />
                    <p
                      className="text-xs mt-1 leading-relaxed"
                      style={{ color: "#03033f77", fontFamily: "var(--font-brand), sans-serif", letterSpacing: "0.06em" }}
                    >
                      {m.position}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-24 px-6 text-center"
        style={{ backgroundColor: "#03033f" }}
      >
        <div className="max-w-xl mx-auto flex flex-col items-center gap-8">
          <h2
            className="text-2xl font-bold tracking-[0.12em] uppercase text-white"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            Work With Our Team
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/contact"
              className="px-8 py-3.5 bg-white font-bold text-sm tracking-widest uppercase hover:bg-white/90 transition-colors"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Get in Touch
            </Link>
            <Link
              href="/products"
              className="px-8 py-3.5 border border-white/40 text-white font-bold text-sm tracking-widest uppercase hover:border-white hover:bg-white/5 transition-colors"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
