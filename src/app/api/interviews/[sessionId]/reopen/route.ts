import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

// Flips a completed session back to IN_PROGRESS so the outgoing person can
// append more turns. Subsequent synthesize calls won't duplicate stakeholders
// (the synthesize endpoint already does a case-insensitive name match), and
// decisions/loops/watch-outs simply append.
export async function POST(
  _req: Request,
  { params }: { params: { sessionId: string } },
) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const session = await prisma.interviewSession.findFirst({
    where: { id: params.sessionId, startedByUserId: ctx.userId ?? "__none__" },
  });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const updated = await prisma.interviewSession.update({
    where: { id: session.id },
    data: { status: "IN_PROGRESS", completedAt: null },
  });
  return NextResponse.json({ session: updated });
}
