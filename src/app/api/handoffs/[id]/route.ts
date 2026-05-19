import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";
import { callerReceiver, includedNoteIdsFor, isSender } from "@/lib/handoff-access";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  packageNote: z.string().max(4000).nullable().optional(),
  type: z
    .enum(["LEAVE", "ROTATION", "DELEGATION", "ATTRITION", "STAND_IN", "ONBOARDING"])
    .optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  const handoff = await prisma.handoff.findUnique({
    where: { id: params.id },
    include: { receivers: true },
  });
  if (!handoff) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const sender = isSender(handoff, ctx);
  const rec = callerReceiver(handoff, ctx);
  if (!sender && !rec) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Determine which honest notes the caller is allowed to see.
  let visibleNoteIds: string[] = [];
  if (sender) {
    // Sender sees all honest notes that anyone on this handoff would see —
    // i.e. the union, for the share dialog state.
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
    const canSee =
      rec.status === "TRANSFERRED" || rec.status === "ACKNOWLEDGED";
    if (canSee) {
      visibleNoteIds = includedNoteIdsFor(rec);
    }
  }

  const honestNotes =
    visibleNoteIds.length > 0
      ? await prisma.honestNote.findMany({
          where: { id: { in: visibleNoteIds }, contextId: handoff.contextId },
          select: { id: true, topic: true, content: true, sensitivity: true },
        })
      : [];

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
    where: { id: found.id },
    data: parsed.data as Parameters<typeof prisma.handoff.update>[0]["data"],
  });
  return NextResponse.json({ handoff: updated });
}
