import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Full data dump of the caller's tenant — everything they own, including
// honest notes and interview transcripts. JSON file the user downloads.
export async function GET() {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const userId = ctx.userId!;

  const [contexts, handoffsSent, handoffsReceived, interviews, qa, feedback] =
    await Promise.all([
      prisma.context.findMany({
        where: { ownerUserId: userId },
        include: {
          stakeholders: true,
          decisions: true,
          openLoops: true,
          watchOuts: true,
          honestNotes: true,
          artifacts: true,
        },
      }),
      prisma.handoff.findMany({ where: { fromUserId: userId } }),
      prisma.handoff.findMany({
        where: {
          OR: [
            { toUserId: userId },
            ctx.email ? { toEmail: ctx.email } : { id: "__never__" },
          ],
        },
      }),
      prisma.interviewSession.findMany({
        where: { startedByUserId: userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      }),
      prisma.qaInteraction.findMany({ where: { askedByUserId: userId } }),
      prisma.receiverFeedback.findMany({
        where: { handoff: { toUserId: userId } },
      }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: { id: userId, email: ctx.email },
    contexts,
    handoffsSent,
    handoffsReceived,
    interviews,
    qaInteractions: qa,
    feedback,
  };

  const body = JSON.stringify(payload, null, 2);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="contextbridge-export-${stamp}.json"`,
    },
  });
}
