import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";
import { callerReceiver } from "@/lib/handoff-access";

export const dynamic = "force-dynamic";

const Schema = z.object({
  daysIn: z.number().int().min(0).max(365),
  content: z.string().min(1).max(4000),
  valueRating: z.number().int().min(1).max(5).optional(),
  gapFlag: z.boolean().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const handoff = await prisma.handoff.findUnique({
    where: { id: params.id },
    include: { receivers: true },
  });
  if (!handoff) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const rec = callerReceiver(handoff, ctx);
  if (!rec) return NextResponse.json({ error: "not_a_receiver" }, { status: 403 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const fb = await prisma.receiverFeedback.create({
    data: {
      tenantId: handoff.tenantId,
      handoffId: handoff.id,
      receiverId: rec.id.startsWith("legacy:") ? null : rec.id,
      daysIn: parsed.data.daysIn,
      content: parsed.data.content,
      valueRating: parsed.data.valueRating,
      gapFlag: parsed.data.gapFlag ?? false,
    },
  });
  return NextResponse.json({ feedback: fb });
}
