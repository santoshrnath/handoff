import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const Schema = z.object({
  itemKind: z.enum(["STAKEHOLDER", "DECISION", "OPEN_LOOP", "WATCH_OUT", "PROCESS", "SNAPSHOT"]),
  itemId: z.string().min(1),
  status: z.enum(["CONFIRMED", "UNCLEAR", "OUTDATED"]),
  note: z.string().max(2000).optional(),
});

// Receiver marks an item from the handoff as confirmed, unclear, or outdated.
// Idempotent: upserts on (handoffId, itemKind, itemId).
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
  const result = await prisma.realityCheck.upsert({
    where: {
      handoffId_itemKind_itemId: {
        handoffId: handoff.id,
        itemKind: parsed.data.itemKind,
        itemId: parsed.data.itemId,
      },
    },
    create: {
      tenantId: handoff.tenantId,
      handoffId: handoff.id,
      itemKind: parsed.data.itemKind,
      itemId: parsed.data.itemId,
      status: parsed.data.status,
      note: parsed.data.note,
      markedBy: ctx.userId!,
    },
    update: {
      status: parsed.data.status,
      note: parsed.data.note,
    },
  });
  return NextResponse.json({ realityCheck: result });
}

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
  });
  if (!handoff) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const list = await prisma.realityCheck.findMany({
    where: { handoffId: handoff.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ realityChecks: list });
}
