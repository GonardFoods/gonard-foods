import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { driverSessionOptions, type DriverSession } from "@/lib/session";
import { checkRateLimit, getIP } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const { allowed } = await checkRateLimit(getIP(req), "driver-login", { limit: 5, windowSec: 900 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many login attempts. Please try again in 15 minutes." }, { status: 429 });
  }

  const { username, password } = await req.json();

  if (
    username !== process.env.DRIVER_USERNAME ||
    password !== process.env.DRIVER_PASSWORD
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getIronSession<DriverSession>(await cookies(), driverSessionOptions);
  session.isDriver = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
