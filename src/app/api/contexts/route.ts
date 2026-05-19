import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext, tenantWhere } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthContext();
  const contexts = await prisma.context.findMany({
    where: tenantWhere(ctx),
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          stakeholders: true,
          decisions: true,
          openLoops: true,
          watchOuts: true,
          honestNotes: true,
          handoffs: true,
        },
      },
    },
  });
  return NextResponse.json({ contexts });
}

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  type: z
    .enum(["PROJECT", "CLIENT", "WORKSTREAM", "PROCESS", "STAKEHOLDER", "ACCOUNT"])
    .default("PROJECT"),
  description: z.string().max(4000).optional(),
  importance: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  sensitivity: z.enum(["PUBLIC", "TEAM", "PRIVATE", "POLITICAL"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "STANDING", "ARCHIVED"]).optional(),
});

export async function POST(req: Request) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  if (!ctx.userId) {
    return NextResponse.json({ error: "no_user" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const created = await prisma.context.create({
    data: {
      tenantId: ctx.tenantId,
      ownerUserId: ctx.userId,
      ownerEmail: ctx.email ?? undefined,
      ...parsed.data,
    },
  });
  return NextResponse.json({ context: created });
}
