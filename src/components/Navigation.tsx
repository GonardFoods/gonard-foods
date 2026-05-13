"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";

const navLinks = [
  { label: "Products", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const adminMenuItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Prices", href: "/admin/prices" },
];

function AdminMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative flex items-center">
      {/* Profile icon — goes to /admin */}
      <Link
        href="/admin"
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Admin dashboard"
        title="Admin dashboard"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </Link>

      {/* Chevron — toggles dropdown */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-5 h-8 hover:text-white transition-colors"
        aria-label="Admin menu"
        style={{ color: "rgba(255,255,255,0.6)" }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-44 py-1 z-50"
          style={{ backgroundColor: "#03033f", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
        >
          {adminMenuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-xs font-bold tracking-widest uppercase text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              {item.label}
            </Link>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} className="my-1" />
          <button
            onClick={signOut}
            className="w-full text-left px-4 py-2.5 text-xs font-bold tracking-widest uppercase text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            style={{ fontFamily: "var(--font-brand), sans-serif" }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navigation({ isAdmin }: { isAdmin?: boolean }) {
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
          {isAdmin ? (
            <AdminMenu />
          ) : (
            <Link
              href="/login"
              className="text-white/75 hover:text-white text-sm font-bold tracking-widest uppercase transition-colors duration-200"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Sign In
            </Link>
          )}

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
            href="/products"
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
          {isAdmin ? (
            <>
              {adminMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white/75 hover:text-white text-sm font-bold tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-brand), sans-serif" }}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </>
          ) : (
            <Link
              href="/login"
              className="text-white/75 hover:text-white text-sm font-bold tracking-widest uppercase"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
              onClick={() => setMobileOpen(false)}
            >
              Sign In
            </Link>
          )}
          <Link
            href="/products"
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
