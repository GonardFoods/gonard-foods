"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { CATEGORY_LABELS, getProductPhotos, type Category, type FreshFrozen, type Product } from "@/data/products";

const CATEGORIES: { value: "all" | Category; label: string }[] = [
  { value: "all", label: "All Products" },
  { value: "chicken", label: "Chicken" },
  { value: "beef", label: "Beef" },
  { value: "lamb", label: "Lamb" },
  { value: "goat", label: "Goat" },
  { value: "turkey-duck", label: "Turkey & Duck" },
  { value: "seafood", label: "Seafood" },
];

const FRESHNESS: { value: "all" | FreshFrozen; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fresh", label: "Fresh" },
  { value: "frozen", label: "Frozen" },
];

const CATEGORY_COLORS: Record<Category, string> = {
  chicken: "#f59e0b",
  beef: "#dc2626",
  lamb: "#7c3aed",
  goat: "#059669",
  "turkey-duck": "#0284c7",
  seafood: "#0891b2",
};

export default function ProductList({ products }: { products: Product[] }) {
  const [category, setCategory] = useState<"all" | Category>("all");
  const [freshness, setFreshness] = useState<"all" | FreshFrozen>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (freshness !== "all" && p.freshFrozen !== freshness) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.subcategory.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [products, category, freshness, search]);

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
            Our Catalog
          </p>
          <h1
            className="text-white text-4xl sm:text-5xl font-bold tracking-[0.12em] uppercase"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            Products
          </h1>
          <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
          <p className="mt-6 text-white/60 text-sm leading-relaxed max-w-xl mx-auto">
            Over 80 products across all major protein categories. Prices available upon sign-in or inquiry.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <section className="sticky top-20 z-40 bg-white border-b" style={{ borderColor: "#03033f14" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4">

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const active = category === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className="px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition-colors duration-150"
                  style={{
                    fontFamily: "var(--font-brand), sans-serif",
                    backgroundColor: active ? "#03033f" : "transparent",
                    color: active ? "#ffffff" : "#03033f99",
                    border: active ? "1px solid #03033f" : "1px solid #03033f33",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Fresh/Frozen + Search */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex gap-2">
              {FRESHNESS.map((f) => {
                const active = freshness === f.value;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFreshness(f.value)}
                    className="px-3 py-1 text-xs font-bold tracking-widest uppercase transition-colors duration-150"
                    style={{
                      fontFamily: "var(--font-brand), sans-serif",
                      backgroundColor: active ? "#03033f" : "transparent",
                      color: active ? "#ffffff" : "#03033f99",
                      border: active ? "1px solid #03033f" : "1px solid #03033f33",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 sm:max-w-xs">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full px-4 py-2 text-sm outline-none"
                style={{
                  border: "1px solid #03033f33",
                  color: "#03033f",
                  fontFamily: "var(--font-brand), sans-serif",
                }}
              />
            </div>

            <p
              className="text-xs ml-auto"
              style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}
            >
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </section>

      {/* Product grid */}
      <section className="py-12 px-6" style={{ backgroundColor: "#f8f8fb", minHeight: "60vh" }}>
        <div className="max-w-7xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <p
                className="text-sm tracking-widest uppercase"
                style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}
              >
                No products match your filters
              </p>
              <button
                onClick={() => { setCategory("all"); setFreshness("all"); setSearch(""); }}
                className="mt-4 text-xs font-bold tracking-widest uppercase underline"
                style={{ color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="bg-white flex flex-col hover:shadow-lg transition-shadow duration-300"
                >
                  {/* Color band by category */}
                  <div
                    className="h-1 w-full"
                    style={{ backgroundColor: CATEGORY_COLORS[product.category] }}
                  />

                  {/* Photo or placeholder */}
                  {(() => {
                    const firstPhoto = getProductPhotos(product)[0];
                    return (
                      <div
                        className="w-full aspect-video relative overflow-hidden flex items-center justify-center"
                        style={{ backgroundColor: "#f0f0f5" }}
                      >
                        {firstPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={firstPhoto.url}
                            alt={product.name}
                            className="w-full h-full object-cover absolute inset-0"
                            style={{ objectPosition: `${firstPhoto.x ?? 50}% ${firstPhoto.y ?? 50}%` }}
                          />
                        ) : (
                          <span className="text-xs tracking-widest uppercase" style={{ color: "#03033f44", fontFamily: "var(--font-brand), sans-serif" }}>
                            Photo Coming Soon
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <div className="p-5 flex flex-col gap-3 flex-1">
                    {/* Badges row */}
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase"
                        style={{
                          backgroundColor: "#03033f0d",
                          color: "#03033f99",
                          fontFamily: "var(--font-brand), sans-serif",
                        }}
                      >
                        {CATEGORY_LABELS[product.category]}
                      </span>
                      {product.halal && (
                        <span
                          className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase"
                          style={{
                            backgroundColor: "#16a34a14",
                            color: "#16a34a",
                            fontFamily: "var(--font-brand), sans-serif",
                          }}
                        >
                          Halal
                        </span>
                      )}
                      {product.freshFrozen === "both" ? (
                        <>
                          <span className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: "#0284c714", color: "#0284c7", fontFamily: "var(--font-brand), sans-serif" }}>Fresh</span>
                          <span className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: "#7c3aed14", color: "#7c3aed", fontFamily: "var(--font-brand), sans-serif" }}>Frozen</span>
                        </>
                      ) : product.freshFrozen ? (
                        <span
                          className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase"
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
                    <h3
                      className="font-bold text-sm leading-snug"
                      style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                    >
                      {product.name}
                    </h3>

                    {/* Subcategory */}
                    <p
                      className="text-xs tracking-widest uppercase"
                      style={{ color: "#03033f55", fontFamily: "var(--font-brand), sans-serif" }}
                    >
                      {product.subcategory}
                    </p>

                    {/* Description */}
                    <p className="text-xs leading-relaxed flex-1" style={{ color: "#03033f88" }}>
                      {product.description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 mt-auto border-t" style={{ borderColor: "#03033f0d" }}>
                      <span
                        className="text-xs tracking-widest uppercase"
                        style={{ color: "#03033f55", fontFamily: "var(--font-brand), sans-serif" }}
                      >
                        {product.unit}
                      </span>
                      <span
                        className="text-xs font-bold tracking-widest uppercase"
                        style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                      >
                        View →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-white text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
          <h2
            className="text-2xl font-bold tracking-[0.12em] uppercase"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Need Custom Quantities or Pricing?
          </h2>
          <div className="w-10 h-0.5" style={{ backgroundColor: "#03033f" }} />
          <p className="text-sm leading-relaxed" style={{ color: "#03033f99" }}>
            Wholesale accounts and custom pricing are available for restaurants and food service businesses. Contact us to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/contact"
              className="px-8 py-3.5 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Contact Us
            </Link>
            <Link
              href="/products"
              className="px-8 py-3.5 border font-bold text-sm tracking-widest uppercase hover:bg-gray-50 transition-colors"
              style={{ borderColor: "#03033f", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Place an Order
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
