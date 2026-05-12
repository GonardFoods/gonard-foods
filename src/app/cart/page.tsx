"use client";

import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { CATEGORY_LABELS } from "@/data/products";

export default function CartPage() {
  const { items, itemCount, updateQty, removeItem, clearCart } = useCart();

  if (itemCount === 0) {
    return (
      <>
        <section
          className="py-24 px-6 text-center"
          style={{
            backgroundColor: "#03033f",
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          <div className="max-w-3xl mx-auto">
            <p className="text-white/50 text-xs tracking-[0.35em] uppercase mb-4" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
              Your Cart
            </p>
            <h1 className="text-white text-4xl font-bold tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
              Cart
            </h1>
            <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
          </div>
        </section>

        <section className="py-24 px-6 bg-white text-center">
          <div className="max-w-md mx-auto flex flex-col items-center gap-6">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#03033f33" }}>
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            <p className="text-sm tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
              Your cart is empty
            </p>
            <Link
              href="/products"
              className="px-8 py-3.5 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Browse Products
            </Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section
        className="py-24 px-6 text-center"
        style={{
          backgroundColor: "#03033f",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-white/50 text-xs tracking-[0.35em] uppercase mb-4" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
            Your Cart
          </p>
          <h1 className="text-white text-4xl font-bold tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
            Cart
          </h1>
          <div className="w-12 h-0.5 bg-white/30 mx-auto mt-6" />
          <p className="mt-4 text-white/60 text-sm">
            {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
          </p>
        </div>
      </section>

      <section className="py-12 px-6 bg-white">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">

          {/* Item list */}
          <div className="flex flex-col divide-y" style={{ borderTop: "1px solid #03033f0d", borderBottom: "1px solid #03033f0d" }}>
            {items.map((item) => (
              <div key={item.productId} className="py-5 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.productId}`}
                    className="font-bold text-sm hover:opacity-70 transition-opacity"
                    style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs mt-1 tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
                    {CATEGORY_LABELS[item.category]} · {item.unit}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateQty(item.productId, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center border text-sm font-bold hover:bg-gray-50 transition-colors"
                    style={{ borderColor: "#03033f33", color: "#03033f" }}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.productId, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center border text-sm font-bold hover:bg-gray-50 transition-colors"
                    style={{ borderColor: "#03033f33", color: "#03033f" }}
                  >
                    +
                  </button>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-xs tracking-widest uppercase font-bold hover:opacity-50 transition-opacity shrink-0"
                  style={{ color: "#dc2626", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Pricing note */}
          <div
            className="px-5 py-4 text-sm leading-relaxed"
            style={{ backgroundColor: "#f8f8fb", border: "1px solid #03033f0d", color: "#03033f99" }}
          >
            <strong style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Pricing: </strong>
            Prices are confirmed after order review. Wholesale accounts receive custom rates based on volume. Retail customers will receive pricing via email.
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/contact"
              className="flex-1 text-center px-8 py-4 font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#03033f", color: "#ffffff", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Send Order Inquiry
            </Link>
            <Link
              href="/products"
              className="px-8 py-4 border font-bold text-sm tracking-widest uppercase hover:bg-gray-50 transition-colors text-center"
              style={{ borderColor: "#03033f", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            >
              Continue Shopping
            </Link>
          </div>

          {/* Clear cart */}
          <button
            onClick={clearCart}
            className="text-xs tracking-widest uppercase font-bold text-center hover:opacity-50 transition-opacity"
            style={{ color: "#03033f55", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Clear Cart
          </button>
        </div>
      </section>
    </>
  );
}
