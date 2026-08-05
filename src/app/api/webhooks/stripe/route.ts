import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getOrders, updateOrder } from "@/lib/orders-store";
import { getCustomerById, updateCustomer } from "@/lib/customers-store";
import { savePayment, getPaymentByStripeSessionId } from "@/lib/payments-store";
import { randomUUID } from "crypto";

// Records a completed Stripe payment against a customer's account: creates a
// Payment record (drives the account page's balance calc) and decrements
// Customer.balance (the admin-facing figure in /admin/customers). Idempotent
// on session.id — Stripe retries webhook deliveries, so this must be safe to
// call more than once for the same session.
async function creditCustomer(customerId: string, amount: number, note: string, sessionId: string) {
  const existing = await getPaymentByStripeSessionId(sessionId);
  if (existing) return; // already processed this session

  const customer = await getCustomerById(customerId);
  let balanceBefore: number | undefined;
  let balanceAfter: number | undefined;
  if (customer) {
    balanceBefore = customer.balance;
    balanceAfter = Math.max(0, customer.balance - amount);
    await updateCustomer(customerId, { balance: balanceAfter });
  }

  await savePayment({
    id: randomUUID(),
    customerId,
    customerName: customer?.name ?? "",
    amount,
    receivedAt: new Date().toISOString(),
    source: "stripe",
    note,
    sageSynced: false,
    balanceBefore,
    balanceAfter,
    stripeSessionId: sessionId,
  });
}

async function handleCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const type = session.metadata?.type;

  if (type === "order") {
    const orderId = session.metadata?.orderId;
    if (!orderId) return;
    const orders = await getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.stripePaid) return; // not found, or already processed

    await updateOrder(orderId, {
      stripePaid: true,
      stripePaidAt: new Date().toISOString(),
      stripeAmountCharged: (session.amount_total ?? 0) / 100,
      stripeSessionId: session.id,
    });

    if (order.customerId && order.invoiceTotal != null) {
      await creditCustomer(
        order.customerId,
        order.invoiceTotal,
        `Stripe payment — order #${orderId.slice(-6).toUpperCase()}`,
        session.id
      );
    }
    return;
  }

  if (type === "balance") {
    const customerId = session.metadata?.customerId;
    const baseAmount = Number(session.metadata?.baseAmount);
    if (!customerId || !Number.isFinite(baseAmount)) return;
    await creditCustomer(customerId, baseAmount, "Stripe payment — outstanding balance", session.id);
    return;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set — rejecting webhook.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await handleCheckoutSession(event.data.object as Stripe.Checkout.Session);
    }
  } catch (err) {
    console.error(`Error handling Stripe webhook event ${event.id} (${event.type}):`, err);
    // Return 500 so Stripe retries — the handler above is idempotent.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
