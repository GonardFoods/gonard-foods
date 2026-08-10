import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getOrders } from "@/lib/orders-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

function csvEscape(v: string | number | undefined) {
  if (v == null) return "";
  let s = String(v);
  // Formula injection: order notes/name are customer-controlled free text. If a
  // cell starts with =, +, -, or @, Excel/Sheets treats it as a formula on open -
  // prefix with a tab so it's always read back as inert text.
  if (/^[=+\-@]/.test(s)) s = "\t" + s;
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.startsWith("\t")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") ?? "pending";
  const allOrders = await getOrders();

  const orders = allOrders.filter((o) =>
    statusFilter === "all" ? true : o.status === statusFilter
  );

  const rows: string[] = [
    ["Order ID", "Date", "Customer Name", "Company", "Email", "Phone", "Item No", "Product Name", "Cases", "Notes", "Status"]
      .map(csvEscape)
      .join(","),
  ];

  for (const order of orders) {
    const date = new Date(order.createdAt).toLocaleDateString("en-CA");
    for (const item of order.items) {
      rows.push(
        [
          order.id,
          date,
          order.customer.name,
          order.customer.company ?? "",
          order.customer.email,
          order.customer.phone ?? "",
          item.itemNo,
          item.name,
          item.qty,
          order.notes ?? "",
          order.status,
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }

  const csv = "﻿" + rows.join("\r\n");
  const filename = `gonard-orders-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
