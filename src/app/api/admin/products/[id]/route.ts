import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getAllProducts, saveAllProducts } from "@/lib/products-store";
import { revalidateTag } from "next/cache";
import type { Product } from "@/data/products";

async function isAdmin(): Promise<boolean> {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const updates = (await req.json()) as Partial<Product>;
  const products = await getAllProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return Response.json({ error: "Not found" }, { status: 404 });
  const updated = [...products];
  updated[idx] = { ...updated[idx], ...updates };
  await saveAllProducts(updated);
  revalidateTag("products", {});
  return Response.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const products = await getAllProducts();
  const filtered = products.filter((p) => p.id !== id);
  if (filtered.length === products.length) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  await saveAllProducts(filtered);
  revalidateTag("products", {});
  return Response.json({ ok: true });
}
