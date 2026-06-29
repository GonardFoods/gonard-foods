import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { updatePayment } from "@/lib/payments-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

// PATCH /api/admin/payments/[id]  — currently only supports { sageSynced: true }
// Used by the admin UI to mark a payment as manually entered in Sage.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { sageSynced?: boolean };

  if (typeof body.sageSynced !== "boolean") {
    return Response.json({ error: "sageSynced (boolean) required." }, { status: 400 });
  }

  const updated = await updatePayment(id, { sageSynced: body.sageSynced });
  if (!updated) return Response.json({ error: "Payment not found." }, { status: 404 });
  return Response.json(updated);
}
