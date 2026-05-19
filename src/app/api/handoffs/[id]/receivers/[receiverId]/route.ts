import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  audienceLabel: z.string().max(200).nullable().optional(),
  toName: z.string().max(200).nullable().optional(),
  includedHonestNoteIds: z.array(z.string()).optional(),
});

async function senderOwned(
  handoffId: string,
  receiverId: string,
  userId: string | null,
) {
  return prisma.handoffReceiver.findFirst({
    where: {
      id: receiverId,
      handoffId,
      handoff: { fromUserId: userId ?? "__none__" },
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; receiverId: string } },
) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const found = await senderOwned(params.id, params.receiverId, ctx.userId);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  // Once a receiver is TRANSFERRED, the redaction set is frozen — no
  // retroactive expansion.
  if (
    found.status === "TRANSFERRED" || found.status === "ACKNOWLEDGED"
  ) {
    return NextResponse.json(
      { error: "frozen", message: "Receiver already transferred. Honest-note redaction can't change." },
      { status: 409 },
    );
  }
  const updated = await prisma.handoffReceiver.update({
    where: { id: found.id },
    data: parsed.data as Parameters<typeof prisma.handoffReceiver.update>[0]["data"],
  });
  return NextResponse.json({ receiver: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; receiverId: string } },
) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const found = await senderOwned(params.id, params.receiverId, ctx.userId);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (found.status === "TRANSFERRED" || found.status === "ACKNOWLEDGED") {
    return NextResponse.json(
      { error: "frozen", message: "Receiver already transferred — can't revoke." },
      { status: 409 },
    );
  }
  await prisma.handoffReceiver.delete({ where: { id: found.id } });
  return NextResponse.json({ ok: true });
}
