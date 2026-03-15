import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const sessions = await prisma.checkoutSession.findMany({
    where: {
      userId: user.id,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      asin: true,
      productTitle: true,
      productPrice: true,
      productImage: true,
      expiresAt: true,
    },
  });

  return NextResponse.json(sessions);
}
