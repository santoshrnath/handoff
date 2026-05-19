import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  toEmail: z.string().email().optional(),
  packageNote: z.string().max(4000).nullable().optional(),
  type: z
    .enum(["LEAVE", "ROTATION", "DELEGATION", "ATTRITION", "STAND_IN", "ONBOARDING"])
    .optional(),
  includedHonestNoteIds: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "READY"]).optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
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
          artifacts: true,
        },
      },
    },
  });
  if (!handoff) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Resolve included honest notes if (a) caller is sender, or (b) handoff is
  // TRANSFERRED and caller is the receiver.
  const isSender = handoff.fromUserId === ctx.userId;
  const isReceiver =
    handoff.toUserId === ctx.userId ||
    (!!ctx.email && handoff.toEmail === ctx.email);
  const noteIds = Array.isArray(handoff.includedHonestNoteIds)
    ? (handoff.includedHonestNoteIds as string[])
    : [];

  let honestNotes: { id: string; topic: string; content: string; sensitivity: string }[] = [];
  const canSeeNotes =
    isSender || (isReceiver && handoff.status === "TRANSFERRED" && noteIds.length > 0) ||
    (isReceiver && handoff.status === "ACKNOWLEDGED" && noteIds.length > 0);
  if (canSeeNotes && noteIds.length > 0) {
    honestNotes = await prisma.honestNote.findMany({
      where: { id: { in: noteIds }, contextId: handoff.contextId },
      select: { id: true, topic: true, content: true, sensitivity: true },
    });
  }

  return NextResponse.json({ handoff, honestNotes });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const found = await prisma.handoff.findFirst({
    where: { id: params.id, fromUserId: ctx.userId ?? "__none__" },
  });
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.handoff.update({
    where: { id: params.id },
    data: parsed.data as Parameters<typeof prisma.handoff.update>[0]["data"],
  });
  return NextResponse.json({ handoff: updated });
}
