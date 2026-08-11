import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { driverSessionOptions, type DriverSession } from "@/lib/session";
import { getDriverById } from "@/lib/drivers-store";

// POST /api/driver/select
// Body: { driverId: string } — claims a name on this device for the rest of the shift.
// Body: {} — clears the selection (used by "Switch Driver"), without ending the shared login.
export async function POST(req: Request) {
  const session = await getIronSession<DriverSession>(await cookies(), driverSessionOptions);
  if (!session.isDriver) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { driverId } = (await req.json()) as { driverId?: string };

  if (!driverId) {
    session.selectedDriverId = undefined;
    session.selectedDriverName = undefined;
    await session.save();
    return Response.json({ ok: true });
  }

  const driver = await getDriverById(driverId);
  if (!driver || !driver.active) {
    return Response.json({ error: "Driver not found." }, { status: 404 });
  }

  session.selectedDriverId = driver.id;
  session.selectedDriverName = driver.name;
  await session.save();
  return Response.json({ ok: true, name: driver.name });
}
