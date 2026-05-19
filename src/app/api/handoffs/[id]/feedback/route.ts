import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

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
  const handoff = await prisma.handoff.findFirst({
    where: {
      id: params.id,
      OR: [
        { toUserId: ctx.userId ?? "__none__" },
        ctx.email ? { toEmail: ctx.email } : { id: "__never__" },
      ],
    },
  });
  if (!handoff) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const fb = await prisma.receiverFeedback.create({
    data: {
      tenantId: handoff.tenantId,
      handoffId: handoff.id,
      daysIn: parsed.data.daysIn,
      content: parsed.data.content,
      valueRating: parsed.data.valueRating,
      gapFlag: parsed.data.gapFlag ?? false,
    },
  });
  return NextResponse.json({ feedback: fb });
}
