import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { updateCustomer, deleteCustomer, hashPassword } from "@/lib/customers-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as {
    name?: string; company?: string; phone?: string;
    notes?: string; balance?: number; password?: string;
    sageStatus?: "pending" | "linked" | "new"; sageName?: string;
  };
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.company !== undefined) patch.company = body.company.trim() || undefined;
  if (body.phone !== undefined) patch.phone = body.phone.trim() || undefined;
  if (body.notes !== undefined) patch.notes = body.notes.trim() || undefined;
  if (body.balance !== undefined) patch.balance = Number(body.balance);
  if (body.password?.trim()) patch.passwordHash = await hashPassword(body.password.trim());
  if (body.sageStatus !== undefined) patch.sageStatus = body.sageStatus;
  if (body.sageName !== undefined) patch.sageName = body.sageName.trim() || undefined;

  const updated = await updateCustomer(id, patch);
  if (!updated) return Response.json({ error: "Customer not found." }, { status: 404 });
  const { passwordHash: _, ...pub } = updated;
  return Response.json(pub);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteCustomer(id);
  if (!ok) return Response.json({ error: "Customer not found." }, { status: 404 });
  return Response.json({ ok: true });
}
