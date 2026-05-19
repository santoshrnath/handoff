import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { HandoffPackage } from "@/components/handoff/handoff-package";

export const dynamic = "force-dynamic";

export default async function HandoffDetail({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await getAuthContext();
  if (!ctx.userId) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Sign in to view this handoff.</h1>
      </div>
    );
  }

  const handoff = await prisma.handoff.findFirst({
    where: {
      id: params.id,
      OR: [
        { fromUserId: ctx.userId },
        { toUserId: ctx.userId },
        ctx.email ? { toEmail: ctx.email } : { id: "__never__" },
      ],
    },
    include: {
      context: {
        include: {
          stakeholders: true,
          decisions: true,
          openLoops: true,
          watchOuts: true,
          artifacts: { select: { id: true, originalName: true, summary: true, uploadedAt: true } },
        },
      },
    },
  });
  if (!handoff) notFound();

  const isSender = handoff.fromUserId === ctx.userId;
  const isReceiver =
    handoff.toUserId === ctx.userId ||
    (!!ctx.email && handoff.toEmail === ctx.email);
  const noteIds = Array.isArray(handoff.includedHonestNoteIds)
    ? (handoff.includedHonestNoteIds as string[])
    : [];
  const canSeeNotes =
    isSender ||
    (isReceiver &&
      (handoff.status === "TRANSFERRED" || handoff.status === "ACKNOWLEDGED") &&
      noteIds.length > 0);

  const honestNotes =
    canSeeNotes && noteIds.length > 0
      ? await prisma.honestNote.findMany({
          where: { id: { in: noteIds }, contextId: handoff.contextId },
          select: { id: true, topic: true, content: true, sensitivity: true },
        })
      : [];

  const qa = await prisma.qaInteraction.findMany({
    where: { handoffId: handoff.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/handoffs" className="hover:text-violet-300">
          Handoffs
        </Link>
        <span>›</span>
        <span className="text-slate-300">{handoff.context.title}</span>
      </div>
      <HandoffPackage
        handoff={{
          ...handoff,
          createdAt: handoff.createdAt.toISOString(),
          transferredAt: handoff.transferredAt?.toISOString() ?? null,
          acknowledgedAt: handoff.acknowledgedAt?.toISOString() ?? null,
        }}
        honestNotes={honestNotes}
        qa={qa.map((q) => ({
          ...q,
          createdAt: q.createdAt.toISOString(),
        }))}
        isSender={isSender}
        isReceiver={isReceiver}
      />
    </div>
  );
}
