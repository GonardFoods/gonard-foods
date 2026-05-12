"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/data/products";

export default function AddToCartButton({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const inCart = items.some((i) => i.productId === product.id);

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
      },
      qty
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Quantity selector */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="qty"
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
        >
          Quantity ({product.unit})
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center border text-lg font-bold hover:bg-gray-50 transition-colors"
            style={{ borderColor: "#03033f33", color: "#03033f" }}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <input
            id="qty"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 h-9 text-center text-sm font-bold outline-none"
            style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          />
          <button
            onClick={() => setQty((q) => q + 1)}
            className="w-9 h-9 flex items-center justify-center border text-lg font-bold hover:bg-gray-50 transition-colors"
            style={{ borderColor: "#03033f33", color: "#03033f" }}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Add to cart button */}
      <button
        onClick={handleAdd}
        className="px-8 py-3.5 font-bold text-sm tracking-widest uppercase transition-all duration-200"
        style={{
          backgroundColor: added ? "#16a34a" : "#03033f",
          color: "#ffffff",
          fontFamily: "var(--font-brand), sans-serif",
        }}
      >
        {added ? "Added to Cart ✓" : "Add to Cart"}
      </button>

      {/* View cart nudge */}
      {(added || inCart) && (
        <Link
          href="/cart"
          className="text-center text-xs font-bold tracking-widest uppercase underline transition-opacity hover:opacity-70"
          style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
        >
          View Cart →
        </Link>
      )}

      {/* Pricing note */}
      <p className="text-xs leading-relaxed text-center" style={{ color: "#03033f66" }}>
        Pricing is provided upon order review. Wholesale accounts receive custom rates.
      </p>
    </div>
  );
}
