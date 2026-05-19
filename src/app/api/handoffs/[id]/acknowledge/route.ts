import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";
import { callerReceiver } from "@/lib/handoff-access";

export const dynamic = "force-dynamic";

// Receiver confirms receipt. Acknowledgement happens at the per-receiver
// level. If their HandoffReceiver row was invited by email only, this also
// claims it to their Clerk user id.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();

  const handoff = await prisma.handoff.findUnique({
    where: { id: params.id },
    include: { receivers: true },
  });
  if (!handoff) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const rec = callerReceiver(handoff, ctx);
  if (!rec) return NextResponse.json({ error: "not_a_receiver" }, { status: 403 });

  // Legacy single-receiver handoff: update parent row.
  if (rec.id.startsWith("legacy:")) {
    const updated = await prisma.handoff.update({
      where: { id: handoff.id },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        toUserId: handoff.toUserId ?? ctx.userId!,
      },
    });
    return NextResponse.json({ handoff: updated });
  }

  await prisma.handoffReceiver.update({
    where: { id: rec.id },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      toUserId: rec.toUserId ?? ctx.userId!,
    },
  });

  // Aggregate parent status — if everyone has acked, flip the parent.
  const refreshed = await prisma.handoffReceiver.findMany({
    where: { handoffId: handoff.id },
    select: { status: true },
  });
  if (refreshed.every((r) => r.status === "ACKNOWLEDGED")) {
    await prisma.handoff.update({
      where: { id: handoff.id },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
