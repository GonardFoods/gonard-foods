import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { products, CATEGORY_LABELS, type Category } from "@/data/products";
import OrderCalculator from "./OrderCalculator";

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) return {};
  return {
    title: `${product.name} | Gonard Foods`,
    description: product.description,
  };
}

const CATEGORY_COLORS: Record<Category, string> = {
  chicken: "#f59e0b",
  beef: "#dc2626",
  lamb: "#7c3aed",
  goat: "#059669",
  "turkey-duck": "#0284c7",
  seafood: "#0891b2",
};

function buildExpandedDescription(product: (typeof products)[number]): string {
  const parts: string[] = [product.description];

  if (product.halal) {
    parts.push("This product is halal certified.");
  }
  if (product.freshFrozen === "fresh") {
    parts.push("Delivered fresh — never frozen.");
  } else if (product.freshFrozen === "frozen") {
    parts.push("Frozen to preserve quality and extend shelf life.");
  } else if (product.freshFrozen === "both") {
    parts.push("Available in both fresh and frozen options under the same item number.");
  }
  if (product.supplier) {
    parts.push(`Sourced from ${product.supplier}.`);
  }

  return parts.join(" ");
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  const accentColor = CATEGORY_COLORS[product.category];
  const expanded = buildExpandedDescription(product);

  // Related products: same category, excluding this one, max 4
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <>
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />

      {/* Breadcrumb */}
      <div className="bg-white border-b" style={{ borderColor: "#03033f0d" }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-xs" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
          <Link href="/products" className="hover:opacity-70 tracking-widest uppercase font-bold transition-opacity">
            Products
          </Link>
          <span>/</span>
          <span className="tracking-widest uppercase" style={{ color: accentColor }}>
            {CATEGORY_LABELS[product.category]}
          </span>
          <span>/</span>
          <span className="tracking-widest uppercase truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      {/* Product detail */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

          {/* Image area */}
          <div
            className="aspect-square flex flex-col items-center justify-center gap-4 relative"
            style={{ backgroundColor: accentColor + "10", border: `1px solid ${accentColor}22` }}
          >
            {/* Category colour strip */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: accentColor }}
            />
            <div className="flex flex-col items-center gap-3 opacity-40">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: accentColor + "88", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Photo Coming Soon
            </p>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <span
                className="px-2.5 py-1 text-xs font-bold tracking-widest uppercase"
                style={{ backgroundColor: accentColor + "18", color: accentColor, fontFamily: "var(--font-brand), sans-serif" }}
              >
                {CATEGORY_LABELS[product.category]}
              </span>
              {product.halal && (
                <span
                  className="px-2.5 py-1 text-xs font-bold tracking-widest uppercase"
                  style={{ backgroundColor: "#16a34a14", color: "#16a34a", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  Halal
                </span>
              )}
              {product.freshFrozen === "both" ? (
                <>
                  <span className="px-2.5 py-1 text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: "#0284c714", color: "#0284c7", fontFamily: "var(--font-brand), sans-serif" }}>Fresh</span>
                  <span className="px-2.5 py-1 text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: "#7c3aed14", color: "#7c3aed", fontFamily: "var(--font-brand), sans-serif" }}>Frozen</span>
                </>
              ) : product.freshFrozen ? (
                <span
                  className="px-2.5 py-1 text-xs font-bold tracking-widest uppercase"
                  style={{
                    backgroundColor: product.freshFrozen === "fresh" ? "#0284c714" : "#7c3aed14",
                    color: product.freshFrozen === "fresh" ? "#0284c7" : "#7c3aed",
                    fontFamily: "var(--font-brand), sans-serif",
                  }}
                >
                  {product.freshFrozen}
                </span>
              ) : null}
            </div>

            {/* Name */}
            <div>
              <p
                className="text-xs tracking-widest uppercase mb-2"
                style={{ color: "#03033f55", fontFamily: "var(--font-brand), sans-serif" }}
              >
                {product.subcategory}
              </p>
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-[0.08em] uppercase leading-tight"
                style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
              >
                {product.name}
              </h1>
            </div>

            {/* Divider */}
            <div className="h-px w-12" style={{ backgroundColor: accentColor }} />

            {/* Description */}
            <p className="text-sm leading-relaxed" style={{ color: "#03033fbb" }}>
              {expanded}
            </p>

            {/* Details table */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Unit", value: product.unit },
                { label: "Subcategory", value: product.subcategory },
                ...(product.supplier ? [{ label: "Supplier", value: product.supplier }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span
                    className="tracking-widest uppercase font-bold"
                    style={{ color: "#03033f55", fontFamily: "var(--font-brand), sans-serif" }}
                  >
                    {label}
                  </span>
                  <span style={{ color: "#03033f" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Inventory note */}
            <div
              className="px-4 py-3 text-xs leading-relaxed"
              style={{ backgroundColor: "#f8f8fb", border: "1px solid #03033f0d", color: "#03033f99" }}
            >
              <span className="font-bold" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Availability: </span>
              Contact us to confirm current stock and arrange delivery or pickup.
            </div>

            {/* Order calculator */}
            <OrderCalculator product={product} />
          </div>
        </div>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="py-16 px-6" style={{ backgroundColor: "#f8f8fb" }}>
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-xl font-bold tracking-[0.12em] uppercase mb-2"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              More {CATEGORY_LABELS[product.category]}
            </h2>
            <div className="w-10 h-0.5 mb-8" style={{ backgroundColor: accentColor }} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/products/${rel.id}`}
                  className="bg-white p-5 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200 group"
                >
                  <div className="h-0.5 w-8 mb-1" style={{ backgroundColor: accentColor }} />
                  <h3
                    className="font-bold text-sm leading-snug group-hover:opacity-70 transition-opacity"
                    style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                  >
                    {rel.name}
                  </h3>
                  <p className="text-xs" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
                    {rel.subcategory} · {rel.unit}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
