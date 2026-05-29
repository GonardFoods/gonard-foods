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
  const [weight, setWeight] = useState<number | "">(""); // for per_weight_direct
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [added, setAdded] = useState(false);

  const weightUnit = getWeightUnit(product.unit);
  const inCart = items.some((i) => i.productId === product.id);
  const isWeightDirect = priceData?.pricingType === "per_weight_direct";

  useEffect(() => {
    fetch(`/api/prices/${product.id}`)
      .then((r) => r.json())
      .then((d: PriceData) => setPriceData(d))
      .catch(() => {});
  }, [product.id]);

  // Box-based estimates (per_weight and per_box)
  const estimatedWeight =
    !isWeightDirect && qty > 0 && priceData?.caseWeight != null
      ? qty * priceData.caseWeight
      : null;
  const estimatedPrice =
    !isWeightDirect && estimatedWeight != null && priceData?.pricePerUnit != null
      ? estimatedWeight * priceData.pricePerUnit
      : null;

  // Weight-direct estimate
  const directPrice =
    isWeightDirect && weight !== "" && priceData?.pricePerUnit != null
      ? (weight as number) * priceData.pricePerUnit
      : null;

  function handleAdd() {
    if (isWeightDirect) {
      if (!weight || (weight as number) <= 0) return;
      addItem(
        { productId: product.id, name: product.name, category: product.category, unit: weightUnit },
        weight as number,
      );
    } else {
      if (qty === 0) return;
      addItem(
        { productId: product.id, name: product.name, category: product.category, unit: product.unit },
        qty,
      );
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const canAdd = isWeightDirect ? (weight !== "" && (weight as number) > 0) : qty > 0;

  // ── /weight mode ─────────────────────────────────────────────────────────────
  if (isWeightDirect) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          {/* Weight input */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
              Weight ({weightUnit})
            </span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={weight}
              onChange={(e) => setWeight(e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="e.g. 2.5"
              className="h-10 px-3 text-center text-sm font-bold outline-none"
              style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            />
          </div>

          {/* Estimated price */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
              Est. Price ($)
            </span>
            <div
              className="h-10 flex items-center justify-center border text-sm font-bold"
              style={{ borderColor: "#03033f22", color: "#03033f", backgroundColor: "#f8f8fb", fontFamily: "var(--font-brand), sans-serif" }}
            >
              {directPrice != null ? <>${fmt(directPrice)}</> : <span style={{ color: "#03033f44" }}>—</span>}
            </div>
          </div>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "#03033f66" }}>
          * Enter your desired weight. Estimated price is not an exact quote — final price is based on the actual weight at time of fulfillment.
        </p>

        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="w-full py-3.5 font-bold text-sm tracking-widest uppercase transition-all duration-200"
          style={{
            backgroundColor: added ? "#16a34a" : "#03033f",
            color: "#ffffff",
            fontFamily: "var(--font-brand), sans-serif",
            opacity: canAdd ? 1 : 0.4,
            cursor: canAdd ? "pointer" : "not-allowed",
          }}
        >
          {added ? "Added to Cart ✓" : "Add to Cart"}
        </button>

        {(added || inCart) && (
          <Link href="/cart" className="text-center text-xs font-bold tracking-widest uppercase underline hover:opacity-70 transition-opacity" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
            View Cart →
          </Link>
        )}
      </div>
    );
  }

  // ── Box mode (per_weight or per_box) ─────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        {/* Quantity (cases) */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
            Quantity (CASES)
          </span>
          <div className="flex items-center border" style={{ borderColor: "#03033f33" }}>
            <button
              onClick={() => setQty((q) => Math.max(0, q - 1))}
              className="w-8 h-10 flex items-center justify-center text-base font-bold hover:bg-gray-50 transition-colors shrink-0"
              style={{ color: "#03033f", borderRight: "1px solid #03033f22" }}
            >
              −
            </button>
            <input
              type="number" min={0} value={qty}
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

        {/* Weight */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
            Weight ({weightUnit})
          </span>
          <div
            className="h-10 flex items-center justify-center border text-sm font-bold"
            style={{ borderColor: "#03033f22", color: "#03033f", backgroundColor: "#f8f8fb", fontFamily: "var(--font-brand), sans-serif" }}
          >
            {estimatedWeight != null ? <>{fmt(estimatedWeight, 1)} {weightUnit}</> : <span style={{ color: "#03033f44" }}>—</span>}
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
            Est. Price ($)
          </span>
          <div
            className="h-10 flex items-center justify-center border text-sm font-bold"
            style={{ borderColor: "#03033f22", color: "#03033f", backgroundColor: "#f8f8fb", fontFamily: "var(--font-brand), sans-serif" }}
          >
            {estimatedPrice != null ? <>${fmt(estimatedPrice)}</> : <span style={{ color: "#03033f44" }}>—</span>}
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "#03033f66" }}>
        * Estimated weight and price are not exact quotes. Actual case weight varies. Contact us to confirm final pricing before placing your order.
      </p>

      <button
        onClick={handleAdd}
        disabled={!canAdd}
        className="w-full py-3.5 font-bold text-sm tracking-widest uppercase transition-all duration-200"
        style={{
          backgroundColor: added ? "#16a34a" : "#03033f",
          color: "#ffffff",
          fontFamily: "var(--font-brand), sans-serif",
          opacity: canAdd ? 1 : 0.4,
          cursor: canAdd ? "pointer" : "not-allowed",
        }}
      >
        {added ? "Added to Cart ✓" : "Add to Cart"}
      </button>

      {(added || inCart) && (
        <Link href="/cart" className="text-center text-xs font-bold tracking-widest uppercase underline hover:opacity-70 transition-opacity" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          View Cart →
        </Link>
      )}
    </div>
  );
}
