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

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const products = await getAllProducts();
  return Response.json(products);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const product = (await req.json()) as Product;
  const products = await getAllProducts();
  if (products.find((p) => p.id === product.id)) {
    return Response.json({ error: "A product with this Item No. already exists." }, { status: 400 });
  }
  await saveAllProducts([...products, product]);
  revalidateTag("products", {});
  return Response.json({ ok: true });
}
