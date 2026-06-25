import { createClient } from "@vercel/kv";

function getKV() {
  const url = process.env.gonard_KV_REST_API_URL;
  const token = process.env.gonard_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    return createClient({ url, token });
  } catch {
    return null;
  }
}

interface Options {
  limit: number;     // max requests allowed in the window
  windowSec: number; // window length in seconds
}

/**
 * Increment a per-IP counter in KV and return whether the request is allowed.
 * Fails open (allows the request) if KV is unavailable, so a KV outage doesn't
 * lock users out.
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  { limit, windowSec }: Options,
): Promise<{ allowed: boolean }> {
  const kv = getKV();
  if (!kv) return { allowed: true };

  const key = `rl:${endpoint}:${ip}`;
  try {
    const count = await kv.incr(key);
    if (count === 1) {
      // First hit in this window — set the expiry
      await kv.expire(key, windowSec);
    }
    return { allowed: count <= limit };
  } catch {
    return { allowed: true }; // fail open
  }
}

/** Extract the real client IP from a Next.js request. */
export function getIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
