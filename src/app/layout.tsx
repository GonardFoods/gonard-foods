import type { Metadata } from "next";
import { Josefin_Sans } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { CartProvider } from "@/contexts/CartContext";

const brandFont = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Gonard Foods | Premium Meat Wholesale — Calgary, Alberta",
  description:
    "Gonard Foods supplies premium quality meats to Calgary's restaurants, businesses, and the public. Wholesale and retail delivery across Calgary, Greater Calgary, and Edmonton.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${brandFont.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
        <CartProvider>
          <Navigation />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
