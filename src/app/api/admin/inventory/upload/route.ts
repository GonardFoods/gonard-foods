import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getInventory, saveInventory, parseSageCsv } from "@/lib/inventory-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const text = await req.text();
    if (!text.trim()) return Response.json({ error: "Empty file." }, { status: 400 });

    const parsed = parseSageCsv(text);
    if (!parsed) {
      return Response.json(
        { error: "Could not parse CSV. Make sure the file has columns for Item Number and Quantity on Hand." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const existing = await getInventory();

    let updated = 0;
    for (const { itemNo, onHand } of parsed) {
      existing[itemNo] = { onHand, updatedAt: now };
      updated++;
    }

    await saveInventory(existing);
    return Response.json({ ok: true, updated, importedAt: now });
  } catch (e) {
    console.error("Inventory upload error:", e);
    return Response.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
