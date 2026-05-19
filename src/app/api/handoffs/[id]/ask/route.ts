import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";
import { answerReceiverQuestion } from "@/lib/ai/receiver-qa";
import {
  callerReceiver,
  includedNoteIdsFor,
  isSender,
} from "@/lib/handoff-access";
import { enforceCap, recordUsage } from "@/lib/usage";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const Schema = z.object({ question: z.string().min(2).max(1000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const rl = await enforceRateLimit(req, ctx, "ai");
  if (rl) return rl;
  const cap = await enforceCap(ctx, "RECEIVER_QA");
  if (cap) return cap;

  const handoff = await prisma.handoff.findUnique({
    where: { id: params.id },
    include: {
      receivers: true,
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

  const sender = isSender(handoff, ctx);
  const rec = callerReceiver(handoff, ctx);
  if (!sender && !rec) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Honest-notes visibility: sender sees all, receiver sees only their own
  // included set once status >= TRANSFERRED.
  let noteIds: string[] = [];
  if (sender) {
    const set = new Set<string>();
    for (const r of handoff.receivers) {
      includedNoteIdsFor(r).forEach((id) => set.add(id));
    }
    noteIds = Array.from(set);
  } else if (
    rec &&
    (rec.status === "TRANSFERRED" || rec.status === "ACKNOWLEDGED")
  ) {
    noteIds = includedNoteIdsFor(rec);
  }

  const honestNotes = noteIds.length > 0
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
      receiverId: rec && !rec.id.startsWith("legacy:") ? rec.id : null,
      askedByUserId: ctx.userId!,
      question: parsed.data.question,
      answer: result.answer,
      citations: result.citations,
    },
  });

  await recordUsage(ctx, "RECEIVER_QA");

  return NextResponse.json({ qa });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  const handoff = await prisma.handoff.findUnique({
    where: { id: params.id },
    include: { receivers: true },
  });
  if (!handoff) return NextResponse.json({ interactions: [] });

  const sender = isSender(handoff, ctx);
  const rec = callerReceiver(handoff, ctx);
  if (!sender && !rec) {
    return NextResponse.json({ interactions: [] });
  }

  // Sender sees all Q&A across receivers; each receiver sees only their own.
  const where = sender
    ? { handoffId: handoff.id }
    : rec && !rec.id.startsWith("legacy:")
      ? { handoffId: handoff.id, receiverId: rec.id }
      : { handoffId: handoff.id, askedByUserId: ctx.userId ?? "__none__" };

  const list = await prisma.qaInteraction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ interactions: list });
}
