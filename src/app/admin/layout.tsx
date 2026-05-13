import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionOptions, type AdminSession } from "@/lib/session";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  if (!session.isAdmin) redirect("/login");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8f8fb" }}>
      {/* Admin top bar */}
      <header style={{ backgroundColor: "#03033f", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span
              className="text-white text-xs font-bold tracking-[0.2em] uppercase"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Gonard Foods Admin
            </span>
            <nav className="flex gap-4">
              {[
                { label: "Dashboard", href: "/admin" },
                { label: "Products", href: "/admin/products" },
                { label: "Prices", href: "/admin/prices" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-white/60 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors"
                  style={{ fontFamily: "var(--font-brand), sans-serif" }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="text-white/60 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
