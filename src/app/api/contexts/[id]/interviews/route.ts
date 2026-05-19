import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const Schema = z.object({
  mode: z.enum(["full", "stand_in"]).default("full"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const owned = await prisma.context.findFirst({
    where: { id: params.id, ownerUserId: ctx.userId ?? "__none__" },
  });
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const session = await prisma.interviewSession.create({
    data: {
      tenantId: owned.tenantId,
      contextId: owned.id,
      startedByUserId: ctx.userId!,
      mode: parsed.data.mode,
      phase: "WARM_UP",
    },
  });
  return NextResponse.json({ session });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  const sessions = await prisma.interviewSession.findMany({
    where: {
      contextId: params.id,
      tenantId: ctx.canSeeAllTenants ? undefined : ctx.tenantId,
    },
    orderBy: { startedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });
  return NextResponse.json({ sessions });
}
