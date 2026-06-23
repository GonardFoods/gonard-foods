import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getCategoryPhotos, saveCategoryPhotos } from "@/lib/homepage-store";
import { revalidatePath } from "next/cache";

async function isAdmin(): Promise<boolean> {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await getCategoryPhotos());
}

// PUT body: { slug: string; photoUrl: string | null }
// null photoUrl removes the photo for that slug
export async function PUT(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { slug, photoUrl } = await req.json();
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
  const photos = await getCategoryPhotos();
  if (photoUrl) {
    photos[slug] = photoUrl;
  } else {
    delete photos[slug];
  }
  await saveCategoryPhotos(photos);
  revalidatePath("/");
  return Response.json({ ok: true });
}
