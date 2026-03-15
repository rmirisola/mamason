import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { sessionId } = await params;

  const session = await prisma.checkoutSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.userId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (session.status !== "pending") {
    return NextResponse.json({ error: "Session is not pending" }, { status: 400 });
  }

  await prisma.checkoutSession.update({
    where: { id: sessionId },
    data: { status: "expired" },
  });

  return NextResponse.json({ success: true, asin: session.asin });
}
