import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
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

// POST: client-side upload token generation + completion callback
// The browser calls this to get a short-lived token, then uploads directly to Vercel Blob.
// This bypasses Next.js body size limits — the file never passes through the server.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        // Auth check — only admins can request an upload token
        if (!(await isAdmin())) throw new Error("Unauthorized");
        return {
          allowedContentTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
        };
      },
      onUploadCompleted: async () => {
        // No server-side action needed; the client already has the URL
      },
    });

    return Response.json(jsonResponse);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    );
  }
}
