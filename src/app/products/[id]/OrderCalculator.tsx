"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { getWeightUnit } from "@/data/products";
import type { Product } from "@/data/products";
import type { PriceData } from "@/lib/prices";

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-CA", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function OrderCalculator({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const [qty, setQty] = useState(0);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [added, setAdded] = useState(false);

  const weightUnit = getWeightUnit(product.unit);
  const inCart = items.some((i) => i.productId === product.id);

  useEffect(() => {
    fetch(`/api/prices/${product.id}`)
      .then((r) => r.json())
      .then((d: PriceData) => setPriceData(d))
      .catch(() => {});
  }, [product.id]);

  const estimatedWeight =
    qty > 0 && priceData?.caseWeight != null ? qty * priceData.caseWeight : null;
  const estimatedPrice =
    estimatedWeight != null && priceData?.pricePerUnit != null
      ? estimatedWeight * priceData.pricePerUnit
      : null;

  function handleAdd() {
    if (qty === 0) return;
    addItem(
      { productId: product.id, name: product.name, category: product.category, unit: product.unit },
      qty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Three boxes */}
      <div className="grid grid-cols-3 gap-3">
        {/* Box 1 — Quantity (CASES) */}
        <div className="flex flex-col gap-2">
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Quantity (CASES)
          </span>
          <div
            className="flex items-center border"
            style={{ borderColor: "#03033f33" }}
          >
            <button
              onClick={() => setQty((q) => Math.max(0, q - 1))}
              className="w-8 h-10 flex items-center justify-center text-base font-bold hover:bg-gray-50 transition-colors shrink-0"
              style={{ color: "#03033f", borderRight: "1px solid #03033f22" }}
            >
              −
            </button>
            <input
              type="number"
              min={0}
              value={qty}
              onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
              className="flex-1 min-w-0 h-10 text-center text-sm font-bold outline-none"
              style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            />
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-8 h-10 flex items-center justify-center text-base font-bold hover:bg-gray-50 transition-colors shrink-0"
              style={{ color: "#03033f", borderLeft: "1px solid #03033f22" }}
            >
              +
            </button>
          </div>
        </div>

        {/* Box 2 — Weight */}
        <div className="flex flex-col gap-2">
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Weight ({weightUnit})
          </span>
          <div
            className="h-10 flex items-center justify-center border text-sm font-bold"
            style={{ borderColor: "#03033f22", color: "#03033f", backgroundColor: "#f8f8fb", fontFamily: "var(--font-brand), sans-serif" }}
          >
            {estimatedWeight != null ? (
              <>{fmt(estimatedWeight, 1)} {weightUnit}</>
            ) : (
              <span style={{ color: "#03033f44" }}>—</span>
            )}
          </div>
        </div>

        {/* Box 3 — Price */}
        <div className="flex flex-col gap-2">
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Est. Price ($)
          </span>
          <div
            className="h-10 flex items-center justify-center border text-sm font-bold"
            style={{ borderColor: "#03033f22", color: "#03033f", backgroundColor: "#f8f8fb", fontFamily: "var(--font-brand), sans-serif" }}
          >
            {estimatedPrice != null ? (
              <>${fmt(estimatedPrice)}</>
            ) : (
              <span style={{ color: "#03033f44" }}>—</span>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs leading-relaxed" style={{ color: "#03033f66" }}>
        * Estimated weight and price are not exact quotes. Actual case weight varies. Contact us to confirm final pricing before placing your order.
      </p>

      {/* Add to cart */}
      <button
        onClick={handleAdd}
        disabled={qty === 0}
        className="w-full py-3.5 font-bold text-sm tracking-widest uppercase transition-all duration-200"
        style={{
          backgroundColor: added ? "#16a34a" : "#03033f",
          color: "#ffffff",
          fontFamily: "var(--font-brand), sans-serif",
          opacity: qty === 0 ? 0.4 : 1,
          cursor: qty === 0 ? "not-allowed" : "pointer",
        }}
      >
        {added ? "Added to Cart ✓" : "Add to Cart"}
      </button>

      {(added || inCart) && (
        <Link
          href="/cart"
          className="text-center text-xs font-bold tracking-widest uppercase underline hover:opacity-70 transition-opacity"
          style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
        >
          View Cart →
        </Link>
      )}
    </div>
  );
}
