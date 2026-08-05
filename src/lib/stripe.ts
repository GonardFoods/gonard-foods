import Stripe from "stripe";

// The card-processing surcharge added on top of any Stripe payment, to offset
// the fees Stripe charges — e-transfer stays fee-free, this is the tradeoff
// for the convenience of paying online. Always shown as its own line item so
// it's disclosed up front, never folded silently into the total.
export const STRIPE_SURCHARGE_RATE = 0.03;

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  _stripe = new Stripe(key);
  return _stripe;
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://gonardfoods.com";
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
