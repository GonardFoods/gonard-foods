import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getDrivers, saveDrivers, type Driver } from "@/lib/drivers-store";

async function isAdmin(): Promise<boolean> {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const updates = (await req.json()) as Partial<Driver>;
  const all = await getDrivers();
  const idx = all.findIndex((d) => d.id === id);
  if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });
  all[idx] = { ...all[idx], ...updates, id: all[idx].id };
  await saveDrivers(all);
  return Response.json(all[idx]);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const all = await getDrivers();
  const filtered = all.filter((d) => d.id !== id);
  if (filtered.length === all.length) return Response.json({ error: "Not found" }, { status: 404 });
  await saveDrivers(filtered);
  return Response.json({ ok: true });
}
