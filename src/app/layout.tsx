import type { Metadata } from "next";
import { Josefin_Sans } from "next/font/google";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";
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
    "Gonard Foods supplies premium quality meats to Calgary's restaurants and food service businesses. Wholesale delivery across Calgary, Greater Calgary, and Edmonton.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const adminSession = await getIronSession<AdminSession>(jar, sessionOptions);
  const customerSession = await getIronSession<CustomerSession>(jar, customerSessionOptions);

  const isAdmin = adminSession.isAdmin === true;
  const customer = customerSession.customerId
    ? { name: customerSession.customerName ?? "", email: customerSession.customerEmail ?? "" }
    : null;

  return (
    <html lang="en" className={`${brandFont.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
        <CartProvider>
          <Navigation isAdmin={isAdmin} customer={customer} />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
