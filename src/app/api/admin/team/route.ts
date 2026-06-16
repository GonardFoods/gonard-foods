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

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await getTeam());
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const member = (await req.json()) as TeamMember;
  const all = await getTeam();
  await saveTeam([...all, member]);
  revalidatePath("/team");
  return Response.json({ ok: true });
}
