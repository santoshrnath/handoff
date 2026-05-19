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

const ReceiverSchema = z.object({
  toEmail: z.string().email(),
  toName: z.string().max(200).optional(),
  audienceLabel: z.string().max(200).optional(),
  includedHonestNoteIds: z.array(z.string()).optional(),
});

const CreateSchema = z.object({
  contextId: z.string().min(1),
  type: HandoffTypeEnum.default("ROTATION"),
  packageNote: z.string().max(4000).optional(),
  receivers: z.array(ReceiverSchema).min(1).max(10),
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
        receivers: true,
      },
    }),
    prisma.handoff.findMany({
      where: {
        OR: [
          { receivers: { some: { toUserId: ctx.userId } } },
          ctx.email
            ? { receivers: { some: { toEmail: { equals: ctx.email, mode: "insensitive" } } } }
            : { id: "__never__" },
          // Legacy fallback for pre-multi-receiver rows.
          { toUserId: ctx.userId },
          ctx.email ? { toEmail: { equals: ctx.email, mode: "insensitive" } } : { id: "__never__" },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        context: { select: { id: true, title: true, type: true } },
        receivers: true,
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

  // Dedupe receivers by email (case-insensitive).
  const seen = new Set<string>();
  const receivers = parsed.data.receivers.filter((r) => {
    const key = r.toEmail.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const handoff = await prisma.handoff.create({
    data: {
      tenantId: owned.tenantId,
      contextId: owned.id,
      fromUserId: ctx.userId!,
      fromEmail: ctx.email ?? undefined,
      type: parsed.data.type,
      packageNote: parsed.data.packageNote,
      status: "DRAFT",
      receivers: {
        create: receivers.map((r) => ({
          tenantId: owned.tenantId,
          toEmail: r.toEmail,
          toName: r.toName,
          audienceLabel: r.audienceLabel,
          includedHonestNoteIds: r.includedHonestNoteIds ?? [],
          status: "DRAFT",
        })),
      },
    },
    include: { receivers: true },
  });
  return NextResponse.json({ handoff });
}
