import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getAllProducts } from "@/lib/products-store";
import { getAllProductPriceData } from "@/lib/prices";
import { getWeightUnit } from "@/data/products";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const products = await getAllProducts();
  const prices = await getAllProductPriceData(products.map((p) => p.id));
  return Response.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      itemNo: p.itemNo,
      category: p.category,
      pricingType: prices[p.id]?.pricingType ?? "per_weight",
      weightUnit: getWeightUnit(p.unit),
      pricePerUnit: prices[p.id]?.pricePerUnit ?? null,
    }))
  );
}
