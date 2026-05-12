import Link from "next/link";

const cards = [
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
];

export default function AdminDashboard() {
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

        {/* Placeholder cards for future modules */}
        {["Orders", "Customers", "Reports"].map((name) => (
          <div
            key={name}
            className="bg-white p-7 flex flex-col gap-4 opacity-40 cursor-not-allowed"
            title="Coming soon"
          >
            <div style={{ color: "#03033f" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 9h6M9 12h6M9 15h4" />
              </svg>
            </div>
            <div>
              <h2
                className="font-bold tracking-widest uppercase text-sm"
                style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
              >
                {name}
              </h2>
              <p className="text-xs mt-1" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
                Coming soon
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
