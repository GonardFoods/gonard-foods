import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { driverSessionOptions, type DriverSession } from "@/lib/session";
import DriverPicker from "./DriverPicker";
import DriverOrderList from "./DriverOrderList";

export default async function DriverHome() {
  const session = await getIronSession<DriverSession>(await cookies(), driverSessionOptions);
  if (!session.selectedDriverId) {
    return <DriverPicker />;
  }
  return <DriverOrderList />;
}
