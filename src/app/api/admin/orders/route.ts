import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}
