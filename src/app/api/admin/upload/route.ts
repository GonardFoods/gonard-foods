import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";

async function isAdmin(): Promise<boolean> {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

// GET: diagnostic — returns the current upload configuration status
export async function GET() {
  try {
    if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    let blobImportOk = false;
    try {
      await import("@vercel/blob");
      blobImportOk = true;
    } catch (e) {
      return Response.json({ hasToken, blobImportOk, importError: String(e) });
    }
    return Response.json({ hasToken, blobImportOk, ready: hasToken && blobImportOk });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Top-level catch ensures we always return JSON, never an HTML error page
  try {
    if (!(await isAdmin())) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json(
        {
          error:
            "Photo storage not configured. In your Vercel project: Storage → Add Store → Blob, link it to this project, then redeploy.",
        },
        { status: 503 }
      );
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch (e) {
      return Response.json({ error: `Could not read upload: ${e instanceof Error ? e.message : String(e)}` }, { status: 400 });
    }

    const file = form.get("file") as File | null;
    if (!file) return Response.json({ error: "No file provided." }, { status: 400 });

    // Dynamic import so any module-level init errors are caught here, not by Next.js
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`products/${Date.now()}-${file.name}`, file, { access: "public" });
      return Response.json({ url: blob.url });
    } catch (e) {
      return Response.json(
        { error: `Upload error: ${e instanceof Error ? e.message : String(e)}` },
        { status: 500 }
      );
    }
  } catch (e) {
    return Response.json(
      { error: `Unexpected server error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
