import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { driverSessionOptions, type DriverSession } from "@/lib/session";

export async function POST() {
  const session = await getIronSession<DriverSession>(await cookies(), driverSessionOptions);
  session.destroy();
  return NextResponse.json({ ok: true });
}
