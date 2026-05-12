"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";

const navLinks = [
  { label: "Products", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50" style={{ backgroundColor: "#03033f", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

        {/* Logo + Brand */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 relative">
            <Image
              src="/logo.svg"
              alt="Gonard Foods logo"
              fill
              className="object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
              priority
            />
          </div>
          <span
            className="text-white font-bold tracking-[0.18em] uppercase text-base hidden sm:block"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            Gonard Foods
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/75 hover:text-white text-sm font-bold tracking-widest uppercase transition-colors duration-200"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-5">
          <Link
            href="/login"
            className="text-white/75 hover:text-white text-sm font-bold tracking-widest uppercase transition-colors duration-200"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            Sign In
          </Link>

          {/* Cart icon */}
          <Link href="/cart" className="relative text-white/75 hover:text-white transition-colors duration-200" aria-label="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {itemCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-white rounded-full"
                style={{ backgroundColor: "#f59e0b", fontSize: "9px", fontFamily: "var(--font-brand), sans-serif", fontWeight: 700 }}
              >
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>

          <Link
            href="/order"
            className="bg-white text-sm font-bold tracking-widest uppercase px-6 py-2.5 hover:bg-white/90 transition-colors duration-200"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Order Now
          </Link>
        </div>

        {/* Mobile right side */}
        <div className="md:hidden flex items-center gap-4">
          <Link href="/cart" className="relative text-white/75 hover:text-white transition-colors duration-200" aria-label="Cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {itemCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 text-white rounded-full"
                style={{ backgroundColor: "#f59e0b", fontSize: "9px", fontFamily: "var(--font-brand), sans-serif", fontWeight: 700 }}
              >
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>

          <button
            className="text-white p-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden px-6 py-6 flex flex-col gap-5"
          style={{ backgroundColor: "#03033f", borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/75 hover:text-white text-sm font-bold tracking-widest uppercase"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <hr style={{ borderColor: "rgba(255,255,255,0.1)" }} />
          <Link
            href="/login"
            className="text-white/75 hover:text-white text-sm font-bold tracking-widest uppercase"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
            onClick={() => setMobileOpen(false)}
          >
            Sign In
          </Link>
          <Link
            href="/order"
            className="bg-white text-sm font-bold tracking-widest uppercase px-6 py-3 text-center hover:bg-white/90 transition-colors"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
            onClick={() => setMobileOpen(false)}
          >
            Order Now
          </Link>
        </div>
      )}
    </header>
  );
}
