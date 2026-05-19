import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const HandoffTypeEnum = z.enum([
  "LEAVE",
  "ROTATION",
  "DELEGATION",
  "ATTRITION",
  "STAND_IN",
  "ONBOARDING",
]);

const CreateSchema = z.object({
  contextId: z.string().min(1),
  type: HandoffTypeEnum.default("ROTATION"),
  toEmail: z.string().email().optional(),
  packageNote: z.string().max(4000).optional(),
  includedHonestNoteIds: z.array(z.string()).optional(),
});

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx.userId) {
    return NextResponse.json({ outgoing: [], incoming: [] });
  }
  const [outgoing, incoming] = await Promise.all([
    prisma.handoff.findMany({
      where: { fromUserId: ctx.userId },
      orderBy: { createdAt: "desc" },
      include: {
        context: { select: { id: true, title: true, type: true } },
      },
    }),
    prisma.handoff.findMany({
      where: {
        OR: [
          { toUserId: ctx.userId },
          ctx.email ? { toEmail: ctx.email } : { id: "__never__" },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        context: { select: { id: true, title: true, type: true } },
      },
    }),
  ]);
  return NextResponse.json({ outgoing, incoming });
}

export async function POST(req: Request) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const owned = await prisma.context.findFirst({
    where: { id: parsed.data.contextId, ownerUserId: ctx.userId ?? "__none__" },
  });
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const handoff = await prisma.handoff.create({
    data: {
      tenantId: owned.tenantId,
      contextId: owned.id,
      fromUserId: ctx.userId!,
      fromEmail: ctx.email ?? undefined,
      toEmail: parsed.data.toEmail,
      type: parsed.data.type,
      packageNote: parsed.data.packageNote,
      includedHonestNoteIds: parsed.data.includedHonestNoteIds ?? [],
      status: "DRAFT",
    },
  });
  return NextResponse.json({ handoff });
}
