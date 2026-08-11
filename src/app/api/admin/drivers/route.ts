import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getDrivers, saveDrivers, type Driver } from "@/lib/drivers-store";

async function isAdmin(): Promise<boolean> {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await getDrivers());
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) return Response.json({ error: "Name is required." }, { status: 400 });

  const driver: Driver = {
    id: `drv-${Date.now()}`,
    name: name.trim(),
    active: true,
    createdAt: new Date().toISOString(),
  };
  const all = await getDrivers();
  await saveDrivers([...all, driver]);
  return Response.json(driver, { status: 201 });
}
