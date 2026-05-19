import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const Schema = z.object({
  toEmail: z.string().email(),
  toName: z.string().max(200).optional(),
  audienceLabel: z.string().max(200).optional(),
  includedHonestNoteIds: z.array(z.string()).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const handoff = await prisma.handoff.findFirst({
    where: { id: params.id, fromUserId: ctx.userId ?? "__none__" },
  });
  if (!handoff) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  // Block duplicate emails on the same handoff.
  const existing = await prisma.handoffReceiver.findFirst({
    where: {
      handoffId: handoff.id,
      toEmail: { equals: parsed.data.toEmail, mode: "insensitive" },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "duplicate_email" }, { status: 409 });
  }
  const receiver = await prisma.handoffReceiver.create({
    data: {
      tenantId: handoff.tenantId,
      handoffId: handoff.id,
      toEmail: parsed.data.toEmail,
      toName: parsed.data.toName,
      audienceLabel: parsed.data.audienceLabel,
      includedHonestNoteIds: parsed.data.includedHonestNoteIds ?? [],
      status: "DRAFT",
    },
  });
  return NextResponse.json({ receiver });
}
