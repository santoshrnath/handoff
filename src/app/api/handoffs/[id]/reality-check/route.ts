import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";
import { callerReceiver, isSender } from "@/lib/handoff-access";

export const dynamic = "force-dynamic";

const Schema = z.object({
  itemKind: z.enum([
    "STAKEHOLDER",
    "DECISION",
    "OPEN_LOOP",
    "WATCH_OUT",
    "PROCESS",
    "SNAPSHOT",
  ]),
  itemId: z.string().min(1),
  status: z.enum(["CONFIRMED", "UNCLEAR", "OUTDATED"]),
  note: z.string().max(2000).optional(),
});

// Receiver marks an item against ground truth. Per-receiver (each receiver
// has independent reality-check state). Idempotent: upserts on
// (handoffId, itemKind, itemId, receiverId).
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

  const receiverId = rec.id.startsWith("legacy:") ? null : rec.id;

  // Composite unique with a nullable column doesn't behave the way you'd
  // hope in Postgres (NULL != NULL). Manual upsert keyed on (handoffId,
  // itemKind, itemId, receiverId-or-markedBy) is more reliable.
  const existing = await prisma.realityCheck.findFirst({
    where: {
      handoffId: handoff.id,
      itemKind: parsed.data.itemKind,
      itemId: parsed.data.itemId,
      ...(receiverId
        ? { receiverId }
        : { receiverId: null, markedBy: ctx.userId! }),
    },
  });
  const result = existing
    ? await prisma.realityCheck.update({
        where: { id: existing.id },
        data: { status: parsed.data.status, note: parsed.data.note },
      })
    : await prisma.realityCheck.create({
        data: {
          tenantId: handoff.tenantId,
          handoffId: handoff.id,
          receiverId,
          itemKind: parsed.data.itemKind,
          itemId: parsed.data.itemId,
          status: parsed.data.status,
          note: parsed.data.note,
          markedBy: ctx.userId!,
        },
      });
  return NextResponse.json({ realityCheck: result });
}

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
    return NextResponse.json({ realityChecks: [] });
  }
  // Sender sees all receivers' checks; each receiver sees only their own.
  const where = sender
    ? { handoffId: handoff.id }
    : rec && !rec.id.startsWith("legacy:")
      ? { handoffId: handoff.id, receiverId: rec.id }
      : { handoffId: handoff.id, markedBy: ctx.userId ?? "__none__" };
  const list = await prisma.realityCheck.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ realityChecks: list });
}
