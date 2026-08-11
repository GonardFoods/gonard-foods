import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { driverSessionOptions, type DriverSession } from "@/lib/session";
import { getDrivers } from "@/lib/drivers-store";

async function isDriver() {
  const session = await getIronSession<DriverSession>(await cookies(), driverSessionOptions);
  return session.isDriver === true;
}

// The "pick your name" screen only ever needs active drivers.
export async function GET() {
  if (!(await isDriver())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const drivers = await getDrivers();
  return Response.json(drivers.filter((d) => d.active).map((d) => ({ id: d.id, name: d.name })));
}
