import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

// Confirms the transfer. From this point, the named receiver can see the
// handoff package (incl. the included honest notes). No retroactive expansion.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();

  const found = await prisma.handoff.findFirst({
    where: { id: params.id, fromUserId: ctx.userId ?? "__none__" },
  });
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (found.status === "TRANSFERRED" || found.status === "ACKNOWLEDGED") {
    return NextResponse.json({ handoff: found });
  }

  const updated = await prisma.handoff.update({
    where: { id: params.id },
    data: { status: "TRANSFERRED", transferredAt: new Date() },
  });

  return NextResponse.json({ handoff: updated });
}
