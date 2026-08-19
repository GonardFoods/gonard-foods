import Link from "next/link";

const cards = [
  {
    title: "Products",
    description: "Add, remove, and edit product listings — names, descriptions, photos, and more.",
    href: "/admin/products",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    title: "Prices",
    description: "Update product prices and estimated case weights.",
    href: "/admin/prices",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    title: "Supplier Orders",
    description: "Track orders placed with suppliers — skids, boxes, pricing, and delivery status.",
    href: "/admin/supplier-orders",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Customer Orders",
    description: "View and manage customer orders. Mark delivered, archive once posted to Sage.",
    href: "/admin/orders",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    title: "Customers",
    description: "Manage customer profiles, outstanding balances, and account access.",
    href: "/admin/customers",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21c0-4 3.1-7 7-7" />
        <circle cx="17" cy="11" r="3" />
        <path d="M14 21c0-2.5 1.3-4 3-4s3 1.5 3 4" />
      </svg>
    ),
  },
  {
    title: "Drivers",
    description: "Manage the driver roster and assign delivery orders for signature collection.",
    href: "/admin/drivers",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        <circle cx="12" cy="8" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: "Signatures",
    description: "Look up signed proof-of-delivery for any order — signature, invoice, and timestamp.",
    href: "/admin/signatures",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17c3-4 5 2 8-2s5 2 8-2" />
        <path d="M4 21h16" />
      </svg>
    ),
  },
  {
    title: "Inventory",
    description: "Live stock levels per product — in house, on the way, reserved, and available.",
    href: "/admin/inventory",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    title: "Team Photos",
    description: "Manage team member profiles — names, positions, and photos shown on the public Our Team page.",
    href: "/admin/team",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21c0-4 3.1-7 7-7" />
        <circle cx="17" cy="11" r="3" />
        <path d="M14 21c0-2.5 1.3-4 3-4s3 1.5 3 4" />
        <line x1="17" y1="6" x2="17" y2="8" />
        <line x1="16" y1="7" x2="18" y2="7" />
      </svg>
    ),
  },
  {
    title: "Homepage",
    description: "Upload photos for the product category cards on the public home page.",
    href: "/admin/homepage",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
];

export default async function AdminDashboard() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1
          className="text-2xl font-bold tracking-[0.1em] uppercase"
          style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
        >
          Dashboard
        </h1>
        <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white p-7 flex flex-col gap-4 hover:shadow-md transition-shadow duration-200"
          >
            <div style={{ color: "#03033f" }}>{card.icon}</div>
            <div>
              <h2
                className="font-bold tracking-widest uppercase text-sm"
                style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
              >
                {card.title}
              </h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#03033f99" }}>
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
