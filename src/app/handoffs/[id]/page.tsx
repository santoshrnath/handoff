import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { callerReceiver, includedNoteIdsFor, isSender } from "@/lib/handoff-access";
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

  const handoff = await prisma.handoff.findUnique({
    where: { id: params.id },
    include: {
      receivers: { orderBy: { createdAt: "asc" } },
      context: {
        include: {
          stakeholders: true,
          decisions: true,
          openLoops: true,
          watchOuts: true,
          artifacts: {
            select: { id: true, originalName: true, summary: true, uploadedAt: true },
          },
        },
      },
    },
  });
  if (!handoff) notFound();

  const sender = isSender(handoff, ctx);
  const rec = callerReceiver(handoff, ctx);
  if (!sender && !rec) notFound();

  // Visible honest notes: sender sees union; each receiver sees only their own.
  let visibleNoteIds: string[] = [];
  if (sender) {
    const set = new Set<string>();
    for (const r of handoff.receivers) {
      includedNoteIdsFor(r).forEach((id) => set.add(id));
    }
    includedNoteIdsFor({
      id: handoff.id,
      toUserId: handoff.toUserId,
      toEmail: handoff.toEmail,
      status: handoff.status,
      transferredAt: handoff.transferredAt,
      acknowledgedAt: handoff.acknowledgedAt,
      includedHonestNoteIds: handoff.includedHonestNoteIds,
    }).forEach((id) => set.add(id));
    visibleNoteIds = Array.from(set);
  } else if (rec) {
    const canSee = rec.status === "TRANSFERRED" || rec.status === "ACKNOWLEDGED";
    if (canSee) visibleNoteIds = includedNoteIdsFor(rec);
  }

  const honestNotes =
    visibleNoteIds.length > 0
      ? await prisma.honestNote.findMany({
          where: { id: { in: visibleNoteIds }, contextId: handoff.contextId },
          select: { id: true, topic: true, content: true, sensitivity: true },
        })
      : [];

  // Q&A scope: sender sees everyone's; each receiver sees their own only.
  const qaWhere = sender
    ? { handoffId: handoff.id }
    : rec && !rec.id.startsWith("legacy:")
      ? { handoffId: handoff.id, receiverId: rec.id }
      : { handoffId: handoff.id, askedByUserId: ctx.userId };

  // Same for reality checks.
  const rcWhere = sender
    ? { handoffId: handoff.id }
    : rec && !rec.id.startsWith("legacy:")
      ? { handoffId: handoff.id, receiverId: rec.id }
      : { handoffId: handoff.id, markedBy: ctx.userId };

  const [qa, realityChecks] = await Promise.all([
    prisma.qaInteraction.findMany({
      where: qaWhere,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.realityCheck.findMany({ where: rcWhere }),
  ]);

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
          receivers: handoff.receivers.map((r) => ({
            ...r,
            includedHonestNoteIds: Array.isArray(r.includedHonestNoteIds)
              ? (r.includedHonestNoteIds as string[])
              : [],
            createdAt: r.createdAt.toISOString(),
            transferredAt: r.transferredAt?.toISOString() ?? null,
            acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
          })),
        }}
        callerReceiverId={rec?.id ?? null}
        honestNotes={honestNotes}
        qa={qa.map((q) => ({
          ...q,
          createdAt: q.createdAt.toISOString(),
        }))}
        realityChecks={realityChecks.map((rc) => ({
          itemKind: rc.itemKind,
          itemId: rc.itemId,
          status: rc.status,
          note: rc.note,
          receiverId: rc.receiverId,
        }))}
        isSender={sender}
        isReceiver={!!rec}
      />
    </div>
  );
}
