import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { driverSessionOptions, type DriverSession } from "@/lib/session";
import SwitchDriverButton from "./SwitchDriverButton";

function SignOutButton() {
  return (
    <form action="/api/driver/logout" method="POST">
      <button
        type="submit"
        className="text-white/60 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors"
        style={{ fontFamily: "var(--font-brand), sans-serif" }}
      >
        Sign Out
      </button>
    </form>
  );
}

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const session = await getIronSession<DriverSession>(await cookies(), driverSessionOptions);
  if (!session.isDriver) redirect("/driver-login");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8f8fb" }}>
      <header style={{ backgroundColor: "#03033f", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span
              className="text-white text-xs font-bold tracking-[0.2em] uppercase truncate"
              style={{ fontFamily: "var(--font-brand), sans-serif" }}
            >
              Gonard Foods — Deliveries
            </span>
            {session.selectedDriverName && (
              <span className="text-white/50 text-xs truncate">Driving as {session.selectedDriverName}</span>
            )}
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {session.selectedDriverName && <SwitchDriverButton />}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
