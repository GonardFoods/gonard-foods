import { NextResponse } from "next/server";
import { getProductPriceData } from "@/lib/prices";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getProductPriceData(id);
  return NextResponse.json(data);
}
