import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext, tenantWhere } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  const context = await prisma.context.findFirst({
    where: { id: params.id, ...tenantWhere(ctx) },
    include: {
      stakeholders: { orderBy: { createdAt: "asc" } },
      decisions: { orderBy: { createdAt: "desc" } },
      openLoops: { orderBy: { createdAt: "desc" } },
      watchOuts: { orderBy: { createdAt: "desc" } },
      // Honest notes: only the owner sees them on the context page. Receivers
      // see honest notes via the handoff package after transfer.
      honestNotes:
        ctx.userId && true
          ? { orderBy: { createdAt: "desc" } }
          : false,
      artifacts: { orderBy: { uploadedAt: "desc" } },
      handoffs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!context) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Hide honest notes if caller isn't the owner (admins included — see auth-context.ts).
  if (context.ownerUserId !== ctx.userId) {
    (context as { honestNotes?: unknown }).honestNotes = [];
  }
  return NextResponse.json({ context });
}

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z
    .enum(["PROJECT", "CLIENT", "WORKSTREAM", "PROCESS", "STAKEHOLDER", "ACCOUNT"])
    .optional(),
  description: z.string().max(4000).nullable().optional(),
  currentPhase: z.string().max(200).nullable().optional(),
  orgPosition: z.string().max(400).nullable().optional(),
  processFlow: z.string().max(8000).nullable().optional(),
  workarounds: z.string().max(8000).nullable().optional(),
  importance: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  sensitivity: z.enum(["PUBLIC", "TEAM", "PRIVATE", "POLITICAL"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "STANDING", "ARCHIVED"]).optional(),
  completeness: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const existing = await prisma.context.findFirst({
    where: { id: params.id, ownerUserId: ctx.userId ?? "__none__" },
  });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const updated = await prisma.context.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json({ context: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const existing = await prisma.context.findFirst({
    where: { id: params.id, ownerUserId: ctx.userId ?? "__none__" },
  });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await prisma.context.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
