import type Stripe from "stripe";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

// GET /api/admin/stripe-status
// Reports whether Checkout is hitting a real Stripe account, live vs test mode,
// whether payouts are enabled, and which bank account (masked) payouts go to.
// Never returns the secret key or full account/routing numbers.
export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return Response.json({ configured: false, error: "STRIPE_SECRET_KEY is not set in this environment." });
  }
  const livemode = key.startsWith("sk_live_");

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(null);

    const bankAccounts = (account.external_accounts?.data ?? [])
      .filter((ea): ea is Stripe.BankAccount => ea.object === "bank_account")
      .map((ba) => ({
        bankName: ba.bank_name,
        last4: ba.last4,
        currency: ba.currency.toUpperCase(),
        status: ba.status,
        default: ba.default_for_currency ?? false,
      }));

    return Response.json({
      configured: true,
      livemode,
      accountId: account.id,
      country: account.country,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      payoutSchedule: account.settings?.payouts?.schedule
        ? {
            interval: account.settings.payouts.schedule.interval,
            delayDays: account.settings.payouts.schedule.delay_days,
          }
        : null,
      bankAccounts,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ configured: true, livemode, error: msg });
  }
}
