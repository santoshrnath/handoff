import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";
import { answerReceiverQuestion } from "@/lib/ai/receiver-qa";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const Schema = z.object({ question: z.string().min(2).max(1000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();

  const handoff = await prisma.handoff.findFirst({
    where: {
      id: params.id,
      OR: [
        { fromUserId: ctx.userId ?? "__none__" },
        { toUserId: ctx.userId ?? "__none__" },
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
          artifacts: { select: { id: true, originalName: true, summary: true } },
        },
      },
    },
  });
  if (!handoff) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Sources fed to the model: structured context + honest notes only if the
  // requester is allowed to see them.
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

  const honestNotes = canSeeNotes && noteIds.length > 0
    ? await prisma.honestNote.findMany({
        where: { id: { in: noteIds }, contextId: handoff.contextId },
      })
    : [];

  const sources: Array<{
    kind: "decision" | "stakeholder" | "open_loop" | "watch_out" | "honest_note" | "snapshot" | "artifact";
    id?: string;
    title: string;
    body: string;
  }> = [];

  const c = handoff.context;
  if (c.description || c.currentPhase || c.orgPosition || c.processFlow) {
    sources.push({
      kind: "snapshot",
      title: c.title,
      body: [
        c.description && `Description: ${c.description}`,
        c.currentPhase && `Current phase: ${c.currentPhase}`,
        c.orgPosition && `Org position: ${c.orgPosition}`,
        c.processFlow && `Process: ${c.processFlow}`,
        c.workarounds && `Workarounds: ${c.workarounds}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  for (const s of c.stakeholders) {
    sources.push({
      kind: "stakeholder",
      id: s.id,
      title: `${s.name}${s.role ? ` — ${s.role}` : ""}`,
      body: [
        s.relationship && `Relationship: ${s.relationship}`,
        s.operatingStyle && `Operating style: ${s.operatingStyle}`,
        s.whatTheyCareAbout && `Cares about: ${s.whatTheyCareAbout}`,
        s.howToWorkWithThem && `How to work with: ${s.howToWorkWithThem}`,
        s.watchOuts && `Watch-outs: ${s.watchOuts}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }
  for (const d of c.decisions) {
    sources.push({
      kind: "decision",
      id: d.id,
      title: d.title,
      body: [
        d.rationale && `Rationale: ${d.rationale}`,
        d.alternativesRejected && `Rejected: ${d.alternativesRejected}`,
        d.whoWouldPushBack && `Pushback from: ${d.whoWouldPushBack}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }
  for (const l of c.openLoops) {
    sources.push({
      kind: "open_loop",
      id: l.id,
      title: l.title,
      body: [
        l.state && `State: ${l.state}`,
        l.owner && `Owner: ${l.owner}`,
        l.detail && `Detail: ${l.detail}`,
        l.blocker && `Blocker: ${l.blocker}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }
  for (const w of c.watchOuts) {
    sources.push({
      kind: "watch_out",
      id: w.id,
      title: w.topic,
      body: [
        w.severity && `Severity: ${w.severity}`,
        w.detail && `Detail: ${w.detail}`,
        w.triedBefore && `Tried before: ${w.triedBefore}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }
  for (const a of c.artifacts) {
    if (a.summary) {
      sources.push({
        kind: "artifact",
        id: a.id,
        title: a.originalName,
        body: a.summary,
      });
    }
  }
  for (const h of honestNotes) {
    sources.push({
      kind: "honest_note",
      id: h.id,
      title: h.topic,
      body: h.content,
    });
  }

  const result = await answerReceiverQuestion({
    question: parsed.data.question,
    sources,
  });

  const qa = await prisma.qaInteraction.create({
    data: {
      tenantId: handoff.tenantId,
      handoffId: handoff.id,
      askedByUserId: ctx.userId!,
      question: parsed.data.question,
      answer: result.answer,
      citations: result.citations,
    },
  });

  return NextResponse.json({ qa });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  const list = await prisma.qaInteraction.findMany({
    where: {
      handoffId: params.id,
      handoff: {
        OR: [
          { fromUserId: ctx.userId ?? "__none__" },
          { toUserId: ctx.userId ?? "__none__" },
          ctx.email ? { toEmail: ctx.email } : { id: "__never__" },
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ interactions: list });
}
