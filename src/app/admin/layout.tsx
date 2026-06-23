import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionOptions, type AdminSession } from "@/lib/session";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Dashboard",        href: "/admin" },
  { label: "Products",         href: "/admin/products" },
  { label: "Prices",           href: "/admin/prices" },
  { label: "Supplier Orders",  href: "/admin/supplier-orders" },
  { label: "Customer Orders",  href: "/admin/orders" },
  { label: "Customers",        href: "/admin/customers" },
  { label: "Payments",         href: "/admin/payments" },
  { label: "Inventory",        href: "/admin/inventory" },
  { label: "Team Photos",      href: "/admin/team" },
  { label: "Homepage",         href: "/admin/homepage" },
];

function NavLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="text-white/60 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors flex-shrink-0"
      style={{ fontFamily: "var(--font-brand), sans-serif" }}
    >
      {label}
    </Link>
  );
}

function SignOutButton() {
  return (
    <form action="/api/admin/logout" method="POST" className="flex-shrink-0">
      <button
        type="submit"
        className="text-white/60 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors"
        style={{ fontFamily: "var(--font-brand), sans-serif" }}
      >
        Sign Out
      </button>
    </form>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  if (!session.isAdmin) redirect("/login");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8f8fb" }}>
      {/* Admin top bar */}
      <header style={{ backgroundColor: "#03033f", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        {/* Mobile: logo + sign out on row 1, horizontally-scrollable nav on row 2 */}
        <div className="sm:hidden px-4">
          <div className="h-14 flex items-center justify-between gap-4">
            <span
              className="text-white text-xs font-bold tracking-[0.2em] uppercase flex-shrink-0"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Gonard Foods Admin
            </span>
            <SignOutButton />
          </div>
          <nav
            className="no-scrollbar flex gap-5 overflow-x-auto pb-3"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {NAV_LINKS.map((l) => <NavLink key={l.href} {...l} />)}
          </nav>
        </div>

        {/* Desktop: single row, unchanged */}
        <div className="hidden sm:flex max-w-7xl mx-auto px-6 h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <span
              className="text-white text-xs font-bold tracking-[0.2em] uppercase flex-shrink-0"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Gonard Foods Admin
            </span>
            <nav className="flex gap-4">
              {NAV_LINKS.map((l) => <NavLink key={l.href} {...l} />)}
            </nav>
          </div>

          <SignOutButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">{children}</main>
    </div>
  );
}
