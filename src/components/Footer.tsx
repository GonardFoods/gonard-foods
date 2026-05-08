import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#03033f", color: "rgba(255,255,255,0.7)" }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">

          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 relative shrink-0">
                <Image src="/logo.svg" alt="Gonard Foods logo" fill className="object-contain" style={{ filter: "brightness(0) invert(1)" }} />
              </div>
              <span
                className="text-white font-bold tracking-[0.18em] uppercase text-sm"
                style={{ fontFamily: "var(--font-brand), sans-serif" }}
              >
                Gonard Foods
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              Premium meat wholesale serving Calgary, Greater Calgary, and Edmonton.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3
              className="text-white font-bold tracking-widest uppercase text-xs mb-5"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Navigate
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                { label: "Products", href: "/products" },
                { label: "About Us", href: "/about" },
                { label: "Contact", href: "/contact" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3
              className="text-white font-bold tracking-widest uppercase text-xs mb-5"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Account
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                { label: "Sign In", href: "/login" },
                { label: "Place an Order", href: "/order" },
                { label: "Order History", href: "/account/orders" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3
              className="text-white font-bold tracking-widest uppercase text-xs mb-5"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Contact
            </h3>
            <ul className="space-y-3 text-sm">
              <li>3915 Edmonton Trl #7<br />Calgary, AB T2E 6T1</li>
              <li>
                <a href="tel:4032770991" className="hover:text-white transition-colors duration-200">
                  (403) 277-0991
                </a>
              </li>
              <li>
                <a href="mailto:gfoods@telus.net" className="hover:text-white transition-colors duration-200">
                  gfoods@telus.net
                </a>
              </li>
              <li>Mon–Fri &nbsp;8 AM – 4 PM</li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <p>&copy; {new Date().getFullYear()} Gonard Foods. All rights reserved.</p>
          <p>Calgary, Alberta, Canada</p>
        </div>
      </div>
    </footer>
  );
}
