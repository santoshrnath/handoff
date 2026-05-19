import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  relationship: z
    .enum([
      "CHAMPION",
      "ALLY",
      "NEUTRAL",
      "SKEPTIC",
      "BLOCKER",
      "INFLUENCER",
      "DECISION_MAKER",
      "UNKNOWN",
    ])
    .optional(),
  operatingStyle: z.string().max(2000).nullable().optional(),
  whatTheyCareAbout: z.string().max(2000).nullable().optional(),
  howToWorkWithThem: z.string().max(2000).nullable().optional(),
  watchOuts: z.string().max(2000).nullable().optional(),
});

async function ownedRecord(
  contextId: string,
  stakeholderId: string,
  userId: string | null,
) {
  return prisma.stakeholder.findFirst({
    where: {
      id: stakeholderId,
      contextId,
      context: { ownerUserId: userId ?? "__none__" },
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; stakeholderId: string } },
) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const found = await ownedRecord(params.id, params.stakeholderId, ctx.userId);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const updated = await prisma.stakeholder.update({
    where: { id: params.stakeholderId },
    data: parsed.data as Parameters<typeof prisma.stakeholder.update>[0]["data"],
  });
  return NextResponse.json({ stakeholder: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; stakeholderId: string } },
) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const found = await ownedRecord(params.id, params.stakeholderId, ctx.userId);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  await prisma.stakeholder.delete({ where: { id: params.stakeholderId } });
  return NextResponse.json({ ok: true });
}
