import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";
import { getCustomerById } from "@/lib/customers-store";
import { getOutstandingBalance } from "@/lib/balance";
import { getStripe, getSiteUrl, toCents, STRIPE_SURCHARGE_RATE } from "@/lib/stripe";

// GET /api/account/pay — logged-in customer pays their whole outstanding
// balance (across all delivered orders) via Stripe, plus the card surcharge.
export async function GET() {
  const siteUrl = getSiteUrl();
  const session = await getIronSession<CustomerSession>(await cookies(), customerSessionOptions);
  if (!session.customerId) {
    return NextResponse.redirect(`${siteUrl}/account/login`);
  }

  const customer = await getCustomerById(session.customerId);
  if (!customer) {
    return NextResponse.redirect(`${siteUrl}/account/login`);
  }

  const balance = await getOutstandingBalance(customer);
  if (balance <= 0) {
    return NextResponse.redirect(`${siteUrl}/account`);
  }

  const surcharge = Math.round(balance * STRIPE_SURCHARGE_RATE * 100) / 100;

  const stripe = getStripe();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customer.email,
    line_items: [
      {
        price_data: {
          currency: "cad",
          product_data: { name: "Gonard Foods — Outstanding Balance" },
          unit_amount: toCents(balance),
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
    success_url: `${siteUrl}/pay/success?account=1`,
    cancel_url: `${siteUrl}/account`,
    metadata: { type: "balance", customerId: customer.id, baseAmount: String(balance) },
  });

  if (!checkoutSession.url) {
    return NextResponse.redirect(`${siteUrl}/account`);
  }
  return NextResponse.redirect(checkoutSession.url, { status: 303 });
}
