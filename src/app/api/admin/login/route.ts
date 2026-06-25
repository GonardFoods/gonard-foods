import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { checkRateLimit, getIP } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const { allowed } = await checkRateLimit(getIP(req), "admin-login", { limit: 5, windowSec: 900 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please try again in 15 minutes." }, { status: 429 });
  }

  const { username, password } = await req.json();

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  session.isAdmin = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
