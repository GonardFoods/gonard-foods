import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@/lib/orders-store";
import { getStripe, getSiteUrl, toCents, STRIPE_SURCHARGE_RATE } from "@/lib/stripe";

// GET /api/orders/[id]/pay
// Plain link (from the invoice email or account page) — creates a one-off
// Stripe Checkout Session for this specific order's invoice total plus the
// card surcharge, and redirects the browser straight to it.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const siteUrl = getSiteUrl();
  const orders = await getOrders();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return NextResponse.redirect(`${siteUrl}/pay/cancelled?reason=not-found`);
  }
  if (order.invoiceTotal == null || order.invoiceTotal <= 0) {
    return NextResponse.redirect(`${siteUrl}/pay/cancelled?reason=no-total&order=${id}`);
  }
  if (order.stripePaid) {
    return NextResponse.redirect(`${siteUrl}/pay/success?order=${id}&already=1`);
  }

  const base = order.invoiceTotal;
  const surcharge = Math.round(base * STRIPE_SURCHARGE_RATE * 100) / 100;
  const orderRef = id.slice(-6).toUpperCase();

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.customer.email,
    line_items: [
      {
        price_data: {
          currency: "cad",
          product_data: { name: `Gonard Foods — Invoice #${orderRef}` },
          unit_amount: toCents(base),
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "cad",
          product_data: { name: `Card processing surcharge (${STRIPE_SURCHARGE_RATE * 100}%)` },
          unit_amount: toCents(surcharge),
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/pay/success?order=${id}`,
    cancel_url: `${siteUrl}/pay/cancelled?order=${id}`,
    metadata: { type: "order", orderId: id },
  });

  if (!session.url) {
    return NextResponse.redirect(`${siteUrl}/pay/cancelled?reason=stripe-error&order=${id}`);
  }
  return NextResponse.redirect(session.url, { status: 303 });
}
