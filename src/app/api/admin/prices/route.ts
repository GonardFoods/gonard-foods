import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getAllProductPriceData } from "@/lib/prices";
import { getAllProducts } from "@/lib/products-store";

export async function GET() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  if (!session.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await getAllProducts();
  const ids = products.map((p) => p.id);
  const prices = await getAllProductPriceData(ids);
  return NextResponse.json(prices);
}
