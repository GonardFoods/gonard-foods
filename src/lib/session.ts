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

// Separate, lower-privilege session for the driver-facing delivery/signature app.
// Distinct cookie from admin so a device left in a truck never carries admin access.
// One shared login (isDriver) can be used by any driver; selectedDriverId/-Name track
// which specific driver picked their name on this device, so a shared tablet can be
// handed off between drivers on a route without re-entering the shared password.
export interface DriverSession {
  isDriver?: boolean;
  selectedDriverId?: string;
  selectedDriverName?: string;
}

export const driverSessionOptions: SessionOptions = {
  password: getSessionPassword(),
  cookieName: "gonard-driver",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12, // 12-hour session — covers a full delivery shift
  },
};
