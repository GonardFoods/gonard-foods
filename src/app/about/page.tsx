import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Gonard Foods",
  description: "Learn about Gonard Foods — Calgary's premium meat wholesaler serving restaurants, businesses, and the public across Alberta.",
};

const values = [
  {
    title: "Quality First",
    description: "Every product we carry meets our strict standards for freshness, sourcing, and handling. We don't compromise.",
  },
  {
    title: "Relationships",
    description: "We build long-term partnerships with our clients, offering personalized pricing and service tailored to each account.",
  },
  {
    title: "Reliability",
    description: "Consistent supply, on-time delivery, and a team you can count on — every order, every time.",
  },
  {
    title: "Community",
    description: "Proudly based in Calgary, we serve our community and support the local food industry.",
  },
];

export default function About() {
  return (
    <>
      {/* Page header */}
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
            Who We Are
          </p>
          <h1
            className="text-white text-4xl sm:text-5xl font-bold tracking-[0.12em] uppercase"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            About Gonard Foods
          </h1>
          <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
        </div>
      </section>

      {/* Story */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <h2
            className="text-2xl font-bold tracking-[0.12em] uppercase"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Our Story
          </h2>
          <div className="w-10 h-0.5" style={{ backgroundColor: "#03033f" }} />
          <div className="flex flex-col gap-5 text-base leading-relaxed" style={{ color: "#03033f99" }}>
            <p>
              Gonard Foods is a Calgary-based meat wholesaler supplying premium quality cuts to restaurants and food service businesses across Alberta.
            </p>
            <p>
              We work directly with trusted suppliers to bring a wide selection of beef, poultry, lamb, goat, turkey, duck, and seafood — over 80 products — at competitive wholesale pricing.
            </p>
            <p>
              Our clients include some of Calgary&apos;s finest restaurants, food service operations, and institutions. We offer recurring wholesale accounts with pricing tailored to your volume and needs.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6" style={{ backgroundColor: "#f8f8fb" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-2xl font-bold tracking-[0.12em] uppercase"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              What We Stand For
            </h2>
            <div className="w-10 h-0.5 mx-auto mt-5" style={{ backgroundColor: "#03033f" }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.title} className="bg-white p-8 flex flex-col gap-4">
                <h3
                  className="font-bold tracking-widest uppercase text-sm"
                  style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  {value.title}
                </h3>
                <div className="w-8 h-0.5" style={{ backgroundColor: "#03033f33" }} />
                <p className="text-sm leading-relaxed" style={{ color: "#03033f99" }}>
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service area */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <h2
            className="text-2xl font-bold tracking-[0.12em] uppercase"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Where We Deliver
          </h2>
          <div className="w-10 h-0.5" style={{ backgroundColor: "#03033f" }} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { region: "Calgary", detail: "All areas within the city" },
              { region: "Greater Calgary", detail: "Airdrie, Canmore, Banff, Cochrane, and surrounding areas" },
              { region: "Edmonton", detail: "Via third-party shipping — contact us for details" },
            ].map((area) => (
              <div key={area.region} className="flex flex-col gap-2 p-6" style={{ border: "1px solid #03033f1a" }}>
                <h3
                  className="font-bold tracking-widest uppercase text-sm"
                  style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  {area.region}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#03033f99" }}>
                  {area.detail}
                </p>
              </div>
            ))}
          </div>
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
            Ready to Work With Us?
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
