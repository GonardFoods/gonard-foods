import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { setProductPriceData } from "@/lib/prices";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  if (!session.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { pricePerUnit, caseWeight } = await req.json();

  await setProductPriceData(id, {
    pricePerUnit: pricePerUnit != null ? Number(pricePerUnit) : null,
    caseWeight: caseWeight != null ? Number(caseWeight) : null,
  });

  return NextResponse.json({ ok: true });
}
