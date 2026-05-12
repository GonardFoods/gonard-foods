import type { SessionOptions } from "iron-session";

export interface AdminSession {
  isAdmin?: boolean;
}

export const sessionOptions: SessionOptions = {
  // SESSION_SECRET must be at least 32 characters.
  // Set it in Vercel env vars and in .env.local for local development.
  password: process.env.SESSION_SECRET ?? "changeme-set-SESSION_SECRET-in-env-vars!!",
  cookieName: "gonard-admin",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8-hour session
  },
};
