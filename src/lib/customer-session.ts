import type { SessionOptions } from "iron-session";

export interface CustomerSession {
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
}

export const customerSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "changeme-set-SESSION_SECRET-in-env-vars!!",
  cookieName: "gonard-customer",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30-day session
  },
};
