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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Blob storage not configured. In your Vercel project go to Storage → Create → Blob Store, then redeploy." },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Could not parse upload." }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided." }, { status: 400 });

  try {
    const blob = await put(`products/${Date.now()}-${file.name}`, file, { access: "public" });
    return Response.json({ url: blob.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `Upload failed: ${msg}` }, { status: 500 });
  }
}
