import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx.userId) return NextResponse.json({ nudges: [] });
  const nudges = await prisma.nudge.findMany({
    where: { forUserId: ctx.userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ nudges });
}
