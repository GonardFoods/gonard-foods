import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";

export async function POST() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  session.destroy();
  return NextResponse.json({ ok: true });
}
