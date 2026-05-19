import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const Schema = z.object({
  confirmation: z.literal("DELETE EVERYTHING"),
});

// Wipes all of the caller's data: contexts (which cascade to stakeholders,
// decisions, loops, watch-outs, honest notes, artifacts, handoffs, interviews,
// Q&A, reality checks), plus handoffs they were a receiver on. The Clerk
// account itself is left intact — the user can delete that from Clerk's UI.
export async function POST(req: Request) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const userId = ctx.userId!;

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "type_DELETE_EVERYTHING_to_confirm",
      },
      { status: 400 },
    );
  }

  const contexts = await prisma.context.findMany({
    where: { ownerUserId: userId },
    select: { id: true },
  });
  const contextIds = contexts.map((c) => c.id);

  await prisma.$transaction([
    prisma.qaInteraction.deleteMany({ where: { askedByUserId: userId } }),
    prisma.realityCheck.deleteMany({ where: { markedBy: userId } }),
    prisma.handoff.deleteMany({
      where: {
        OR: [
          { fromUserId: userId },
          { contextId: { in: contextIds } },
          ctx.email ? { toEmail: ctx.email } : { id: "__never__" },
          { toUserId: userId },
        ],
      },
    }),
    prisma.context.deleteMany({ where: { ownerUserId: userId } }),
    prisma.nudge.deleteMany({ where: { forUserId: userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
