import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; noteId: string } },
) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const found = await prisma.honestNote.findFirst({
    where: {
      id: params.noteId,
      contextId: params.id,
      context: { ownerUserId: ctx.userId ?? "__none__" },
    },
  });
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.honestNote.delete({ where: { id: params.noteId } });
  return NextResponse.json({ ok: true });
}
