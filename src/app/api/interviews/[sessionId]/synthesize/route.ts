import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";
import { synthesizeTranscript } from "@/lib/ai/interviewer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Turns the interview transcript into structured records on the context.
// The user can review/edit/delete afterwards — we're populating the skeleton.

export async function POST(
  _req: Request,
  { params }: { params: { sessionId: string } },
) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();

  const session = await prisma.interviewSession.findFirst({
    where: {
      id: params.sessionId,
      startedByUserId: ctx.userId ?? "__none__",
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      context: true,
    },
  });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const synth = await synthesizeTranscript({
    contextTitle: session.context.title,
    contextType: session.context.type,
    transcript: session.messages.map((m) => ({
      role: m.role === "ASSISTANT" ? "assistant" : "user",
      content: m.content,
    })),
  });

  const created = {
    stakeholders: 0,
    decisions: 0,
    openLoops: 0,
    watchOuts: 0,
    honestNotes: 0,
  };

  // Apply snapshot fields (only if not already filled)
  const ctxPatch: Record<string, unknown> = {};
  const snap = synth.snapshot ?? {};
  if (snap.description && !session.context.description)
    ctxPatch.description = snap.description;
  if (snap.currentPhase && !session.context.currentPhase)
    ctxPatch.currentPhase = snap.currentPhase;
  if (snap.orgPosition && !session.context.orgPosition)
    ctxPatch.orgPosition = snap.orgPosition;
  if (snap.processFlow && !session.context.processFlow)
    ctxPatch.processFlow = snap.processFlow;
  if (snap.workarounds && !session.context.workarounds)
    ctxPatch.workarounds = snap.workarounds;
  if (Object.keys(ctxPatch).length > 0) {
    await prisma.context.update({
      where: { id: session.contextId },
      data: ctxPatch,
    });
  }

  for (const s of synth.stakeholders ?? []) {
    if (!s.name) continue;
    const exists = await prisma.stakeholder.findFirst({
      where: { contextId: session.contextId, name: { equals: s.name, mode: "insensitive" } },
    });
    if (exists) continue;
    const relRaw = (s.relationship ?? "UNKNOWN").toUpperCase();
    const rel = (
      [
        "CHAMPION",
        "ALLY",
        "NEUTRAL",
        "SKEPTIC",
        "BLOCKER",
        "INFLUENCER",
        "DECISION_MAKER",
        "UNKNOWN",
      ].includes(relRaw)
        ? relRaw
        : "UNKNOWN"
    ) as
      | "CHAMPION"
      | "ALLY"
      | "NEUTRAL"
      | "SKEPTIC"
      | "BLOCKER"
      | "INFLUENCER"
      | "DECISION_MAKER"
      | "UNKNOWN";
    await prisma.stakeholder.create({
      data: {
        tenantId: session.tenantId,
        contextId: session.contextId,
        name: s.name,
        role: s.role,
        relationship: rel,
        operatingStyle: s.operatingStyle,
        whatTheyCareAbout: s.whatTheyCareAbout,
        howToWorkWithThem: s.howToWorkWithThem,
        watchOuts: s.watchOuts,
      },
    });
    created.stakeholders++;
  }

  for (const d of synth.decisions ?? []) {
    if (!d.title) continue;
    await prisma.decision.create({
      data: {
        tenantId: session.tenantId,
        contextId: session.contextId,
        title: d.title,
        rationale: d.rationale,
        alternativesRejected: d.alternativesRejected,
        whoWouldPushBack: d.whoWouldPushBack,
      },
    });
    created.decisions++;
  }

  for (const l of synth.openLoops ?? []) {
    if (!l.title) continue;
    const stateRaw = (l.state ?? "IN_FLIGHT").toUpperCase();
    const state = (
      ["IN_FLIGHT", "STUCK", "DEFERRED", "BLOCKED"].includes(stateRaw)
        ? stateRaw
        : "IN_FLIGHT"
    ) as "IN_FLIGHT" | "STUCK" | "DEFERRED" | "BLOCKED";
    await prisma.openLoop.create({
      data: {
        tenantId: session.tenantId,
        contextId: session.contextId,
        title: l.title,
        detail: l.detail,
        owner: l.owner,
        blocker: l.blocker,
        state,
      },
    });
    created.openLoops++;
  }

  for (const w of synth.watchOuts ?? []) {
    if (!w.topic) continue;
    const sevRaw = (w.severity ?? "MEDIUM").toUpperCase();
    const sev = (
      ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(sevRaw) ? sevRaw : "MEDIUM"
    ) as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    await prisma.watchOut.create({
      data: {
        tenantId: session.tenantId,
        contextId: session.contextId,
        topic: w.topic,
        detail: w.detail,
        severity: sev,
        triedBefore: w.triedBefore,
      },
    });
    created.watchOuts++;
  }

  for (const h of synth.honestNotes ?? []) {
    if (!h.topic || !h.content) continue;
    const sensRaw = (h.sensitivity ?? "POLITICAL").toUpperCase();
    const sens = (
      ["PUBLIC", "TEAM", "PRIVATE", "POLITICAL"].includes(sensRaw)
        ? sensRaw
        : "POLITICAL"
    ) as "PUBLIC" | "TEAM" | "PRIVATE" | "POLITICAL";
    await prisma.honestNote.create({
      data: {
        tenantId: session.tenantId,
        contextId: session.contextId,
        topic: h.topic,
        content: h.content,
        sensitivity: sens,
      },
    });
    created.honestNotes++;
  }

  // Bump completeness based on what we now have
  const counts = await prisma.context.findUnique({
    where: { id: session.contextId },
    include: {
      _count: {
        select: {
          stakeholders: true,
          decisions: true,
          openLoops: true,
          watchOuts: true,
          honestNotes: true,
        },
      },
    },
  });
  const c = counts?._count;
  let pct = 0;
  if (c) {
    if (c.stakeholders > 0) pct += 25;
    if (c.decisions > 0) pct += 20;
    if (c.openLoops > 0) pct += 15;
    if (c.watchOuts > 0) pct += 15;
    if (c.honestNotes > 0) pct += 15;
    if (session.context.description) pct += 10;
  }

  await prisma.context.update({
    where: { id: session.contextId },
    data: { completeness: Math.min(pct, 100) },
  });

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  return NextResponse.json({ created });
}
