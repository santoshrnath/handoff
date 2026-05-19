import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } },
) {
  const ctx = await getAuthContext();
  const session = await prisma.interviewSession.findFirst({
    where: {
      id: params.sessionId,
      tenantId: ctx.canSeeAllTenants ? undefined : ctx.tenantId,
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      context: { select: { id: true, title: true, type: true } },
    },
  });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ session });
}
