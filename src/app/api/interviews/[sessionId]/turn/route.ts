import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";
import { generateNextQuestion } from "@/lib/ai/interviewer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  userMessage: z.string().min(0).max(8000).optional(),
});

export async function POST(
  req: Request,
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
      context: {
        select: {
          id: true,
          title: true,
          type: true,
          description: true,
          importance: true,
          stakeholders: { select: { name: true, role: true } },
          decisions: { select: { title: true } },
        },
      },
    },
  });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (session.status === "COMPLETED") {
    return NextResponse.json({ error: "completed" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // 1. Persist the outgoing person's reply (if any)
  if (parsed.data.userMessage && parsed.data.userMessage.trim().length > 0) {
    await prisma.interviewMessage.create({
      data: {
        tenantId: session.tenantId,
        sessionId: session.id,
        role: "USER",
        content: parsed.data.userMessage.trim(),
        phase: session.phase,
      },
    });
  }

  // 2. Reload messages
  const messages = await prisma.interviewMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  });

  // 3. Generate next question
  const turn = await generateNextQuestion({
    context: {
      title: session.context.title,
      type: session.context.type,
      description: session.context.description,
      importance: session.context.importance,
      knownStakeholders: session.context.stakeholders,
      knownDecisions: session.context.decisions,
    },
    history: messages.map((m) => ({
      role: m.role === "ASSISTANT" ? "assistant" : "user",
      content: m.content,
      phase: m.phase,
    })),
    phase: session.phase,
    mode: session.mode as "full" | "stand_in",
  });

  // 4. Persist + update phase
  const assistantMsg = await prisma.interviewMessage.create({
    data: {
      tenantId: session.tenantId,
      sessionId: session.id,
      role: "ASSISTANT",
      content: turn.question,
      phase: turn.suggestedPhase,
    },
  });

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { phase: turn.suggestedPhase, status: "IN_PROGRESS" },
  });

  return NextResponse.json({
    assistantMessage: assistantMsg,
    phase: turn.suggestedPhase,
  });
}
