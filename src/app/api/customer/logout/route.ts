import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";

export async function POST() {
  const session = await getIronSession<CustomerSession>(await cookies(), customerSessionOptions);
  session.destroy();
  return Response.json({ ok: true });
}
