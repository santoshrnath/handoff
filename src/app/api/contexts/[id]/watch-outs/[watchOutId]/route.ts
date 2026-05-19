import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; watchOutId: string } },
) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const found = await prisma.watchOut.findFirst({
    where: {
      id: params.watchOutId,
      contextId: params.id,
      context: { ownerUserId: ctx.userId ?? "__none__" },
    },
  });
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.watchOut.delete({ where: { id: params.watchOutId } });
  return NextResponse.json({ ok: true });
}
