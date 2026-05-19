import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

// Receiver confirms receipt. Also claims the handoff to their user id if the
// sender invited them by email.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
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

  const updated = await prisma.handoff.update({
    where: { id: params.id },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date(),
      toUserId: handoff.toUserId ?? ctx.userId!,
    },
  });
  return NextResponse.json({ handoff: updated });
}
