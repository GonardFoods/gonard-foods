import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getSageCustomers, saveSageCustomers, type SageCustomer } from "@/lib/sage-customers-store";
import { revalidatePath } from "next/cache";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      result.push(cur.trim()); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await getSageCustomers());
}

// POST body: raw CSV text (Content-Type: text/plain)
// The column whose header matches /name|customer|company|business|client/i is used as the name.
// If no header row is detected, the first column is used.
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const text = await req.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return Response.json({ error: "Empty file." }, { status: 400 });

  const firstRow = parseRow(lines[0]);
  const headerIdx = firstRow.findIndex((f) => /^(name|customer|company|business|client)/i.test(f));
  const hasHeader = headerIdx >= 0;
  const colIdx = hasHeader ? headerIdx : 0;
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const customers: SageCustomer[] = dataLines
    .map((l) => parseRow(l)[colIdx]?.trim() ?? "")
    .filter((n) => n.length > 0)
    .map((name) => ({ id: crypto.randomUUID(), name }));

  await saveSageCustomers(customers);
  revalidatePath("/admin/customers");
  return Response.json({ count: customers.length });
}

export async function DELETE() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await saveSageCustomers([]);
  return Response.json({ ok: true });
}
