import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "Premium Quality",
    description: "Every cut sourced from trusted suppliers and handled with care from farm to delivery.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    title: "Calgary & Area Delivery",
    description: "Serving all of Calgary, Greater Calgary (Airdrie, Canmore, Banff), and Edmonton.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Wholesale & Retail",
    description: "Custom pricing for restaurants and businesses, with retail availability for the public.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    title: "80+ Products",
    description: "A wide selection of chicken, beef, lamb, goat, turkey, duck, and seafood to meet any need.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
];

const productCategories = [
  { name: "Chicken", description: "Whole birds, wings, breasts, legs, thighs, offal, and more — fresh and frozen", href: "/products?cat=chicken" },
  { name: "Beef", description: "Ground beef, stew, chuck roll, ribs, and stir-fry cuts", href: "/products?cat=beef" },
  { name: "Lamb", description: "Legs, shanks, shoulders, stew, ground lamb, and whole carcass", href: "/products?cat=lamb" },
  { name: "Goat", description: "Whole carcass, 6-way pieces, and stew cuts", href: "/products?cat=goat" },
  { name: "Turkey & Duck", description: "Whole halal turkey, turkey wings, and farm-fed duck", href: "/products?cat=turkey-duck" },
  { name: "Seafood", description: "Basa, salmon, haddock, cod, pompano, prawns, and kingfish", href: "/products?cat=seafood" },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6"
        style={{
          backgroundColor: "#03033f",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="flex flex-col items-center gap-8 max-w-3xl">
          <div className="w-96 h-96 relative">
            <Image src="/logo.svg" alt="Gonard Foods" fill className="object-contain" style={{ filter: "brightness(0) invert(1)" }} priority />
          </div>

          <div className="flex flex-col items-center gap-4">
            <h1
              className="text-white text-5xl sm:text-6xl md:text-7xl font-bold tracking-[0.15em] uppercase"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Gonard Foods
            </h1>
            <p
              className="text-white/60 text-sm sm:text-base tracking-[0.3em] uppercase"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Premium Meat Wholesale
            </p>
            <p className="text-white/50 text-sm tracking-widest uppercase">
              Calgary, Alberta
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <Link
              href="/products"
              className="px-8 py-3.5 bg-white font-bold text-sm tracking-widest uppercase hover:bg-white/90 transition-colors duration-200"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Shop Products
            </Link>
            <Link
              href="/about"
              className="px-8 py-3.5 border border-white/40 text-white font-bold text-sm tracking-widest uppercase hover:border-white hover:bg-white/5 transition-colors duration-200"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 flex flex-col items-center gap-2 text-white/30">
          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Scroll</span>
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 4v16M2 14l6 6 6-6" />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl font-bold tracking-[0.12em] uppercase"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Why Choose Gonard Foods
            </h2>
            <div className="w-12 h-0.5 mx-auto mt-5" style={{ backgroundColor: "#03033f" }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col items-center text-center gap-4">
                <div style={{ color: "#03033f" }}>{feature.icon}</div>
                <h3
                  className="font-bold tracking-widest uppercase text-sm"
                  style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#03033f99" }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products preview */}
      <section className="py-24 px-6" style={{ backgroundColor: "#f8f8fb" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl font-bold tracking-[0.12em] uppercase"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Our Products
            </h2>
            <div className="w-12 h-0.5 mx-auto mt-5" style={{ backgroundColor: "#03033f" }} />
            <p className="mt-6 text-sm leading-relaxed max-w-xl mx-auto" style={{ color: "#03033f99" }}>
              Over 80 products across chicken, beef, lamb, goat, turkey, duck, and seafood. Browse our full catalog to find exactly what you need.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {productCategories.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="bg-white p-8 flex flex-col gap-3 group hover:shadow-lg transition-shadow duration-300"
              >
                <div
                  className="w-full aspect-video bg-gray-100 flex items-center justify-center mb-2"
                  style={{ backgroundColor: "#f0f0f5" }}
                >
                  <span className="text-xs tracking-widest uppercase" style={{ color: "#03033f44", fontFamily: "var(--font-brand), sans-serif" }}>
                    Photo Coming Soon
                  </span>
                </div>
                <h3
                  className="font-bold tracking-widest uppercase text-sm group-hover:opacity-70 transition-opacity"
                  style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  {cat.name}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#03033f99" }}>
                  {cat.description}
                </p>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/products"
              className="inline-block px-10 py-3.5 font-bold text-sm tracking-widest uppercase hover:bg-white hover:shadow-lg transition-all duration-200"
              style={{
                backgroundColor: "#03033f",
                color: "#ffffff",
                fontFamily: "var(--font-brand), sans-serif",
              }}
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* About banner */}
      <section
        className="py-24 px-6 text-center"
        style={{
          backgroundColor: "#03033f",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-8">
          <h2
            className="text-3xl font-bold tracking-[0.12em] uppercase text-white"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            About Gonard Foods
          </h2>
          <div className="w-12 h-0.5 bg-white/30" />
          <p className="text-white/70 leading-relaxed text-base">
            Gonard Foods is a Calgary-based meat wholesaler supplying premium cuts to restaurants, food service businesses, and retail customers across Alberta. We pride ourselves on quality, consistency, and building lasting relationships with our clients.
          </p>
          <Link
            href="/about"
            className="px-8 py-3.5 border border-white/40 text-white font-bold text-sm tracking-widest uppercase hover:border-white hover:bg-white/5 transition-colors duration-200"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            Our Story
          </Link>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-8">
          <h2
            className="text-3xl font-bold tracking-[0.12em] uppercase"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Ready to Place an Order?
          </h2>
          <div className="w-12 h-0.5" style={{ backgroundColor: "#03033f" }} />
          <p className="text-base leading-relaxed max-w-xl" style={{ color: "#03033f99" }}>
            Whether you&apos;re a restaurant looking for a reliable wholesale supplier or a customer seeking premium cuts for home, we&apos;re here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/order"
              className="px-8 py-3.5 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity duration-200"
              style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Place an Order
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3.5 border font-bold text-sm tracking-widest uppercase hover:bg-gray-50 transition-colors duration-200"
              style={{ borderColor: "#03033f", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
