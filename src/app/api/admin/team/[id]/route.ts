import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getTeam, saveTeam } from "@/lib/team-store";
import type { TeamMember } from "@/lib/team-store";
import { revalidatePath } from "next/cache";

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
  const updates = (await req.json()) as Partial<TeamMember>;
  const all = await getTeam();
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });
  all[idx] = { ...all[idx], ...updates };
  await saveTeam(all);
  revalidatePath("/team");
  return Response.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const all = await getTeam();
  const filtered = all.filter((m) => m.id !== id);
  if (filtered.length === all.length) return Response.json({ error: "Not found" }, { status: 404 });
  await saveTeam(filtered);
  revalidatePath("/team");
  return Response.json({ ok: true });
}
