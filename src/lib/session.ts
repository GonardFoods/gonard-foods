import type { SessionOptions } from "iron-session";

function getSessionPassword(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET is not set. Add it to your Vercel environment variables."
      );
    }
    // Development fallback — never reaches production
    return "dev-only-fallback-secret-not-used-in-production-xxxxxxxx";
  }
  return secret;
}

export interface AdminSession {
  isAdmin?: boolean;
}

export const sessionOptions: SessionOptions = {
  password: getSessionPassword(),
  cookieName: "gonard-admin",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8-hour session
  },
};
