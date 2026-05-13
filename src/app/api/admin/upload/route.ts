import { put } from "@vercel/blob";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";

async function isAdmin(): Promise<boolean> {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

// GET: diagnostic
export async function GET() {
  try {
    if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    return Response.json({ hasToken, ready: hasToken });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// POST: accept the raw image body (Content-Type: image/*, X-Filename header)
// and upload directly to Vercel Blob server-side, bypassing any client-side SDK.
export async function POST(req: Request) {
  try {
    if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const contentType = req.headers.get("content-type") ?? "application/octet-stream";
    const rawName = req.headers.get("x-filename") ?? `upload-${Date.now()}`;
    const safeFilename = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const pathname = `products/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFilename}`;

    if (!req.body) return Response.json({ error: "No file body received" }, { status: 400 });

    const blob = await put(pathname, req.body, {
      access: "public",
      contentType,
    });

    return Response.json({ url: blob.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Surface a clear action when the blob store is private-only
    const isStorePrivate = msg.includes("private store") || msg.includes("private access");
    return Response.json(
      {
        error: isStorePrivate
          ? "Your Vercel Blob store is set to private-only. " +
            "Create a new public Blob store in the Vercel dashboard (Storage → Create → Blob → Public access), " +
            "connect it to this project, and redeploy."
          : msg,
      },
      { status: 500 }
    );
  }
}
