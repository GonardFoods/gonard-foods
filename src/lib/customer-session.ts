import type { SessionOptions } from "iron-session";

function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET is not set. Add it to your Vercel environment variables."
      );
    }
    return "dev-only-fallback-secret-not-used-in-production-xxxxxxxx";
  }
  return secret;
}

export interface CustomerSession {
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
}

export const customerSessionOptions: SessionOptions = {
  password: getSessionPassword(),
  cookieName: "gonard-customer",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30-day session
  },
};
