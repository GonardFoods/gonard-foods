import { put } from "@vercel/blob";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";

async function isAdmin(): Promise<boolean> {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
  const blob = await put(`products/${Date.now()}-${file.name}`, file, { access: "public" });
  return Response.json({ url: blob.url });
}
