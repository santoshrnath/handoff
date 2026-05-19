import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const RelationshipEnum = z.enum([
  "CHAMPION",
  "ALLY",
  "NEUTRAL",
  "SKEPTIC",
  "BLOCKER",
  "INFLUENCER",
  "DECISION_MAKER",
  "UNKNOWN",
]);

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  relationship: RelationshipEnum.optional(),
  operatingStyle: z.string().max(2000).optional(),
  whatTheyCareAbout: z.string().max(2000).optional(),
  howToWorkWithThem: z.string().max(2000).optional(),
  watchOuts: z.string().max(2000).optional(),
});

async function ownedContext(id: string, userId: string | null) {
  return prisma.context.findFirst({
    where: { id, ownerUserId: userId ?? "__none__" },
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const owned = await ownedContext(params.id, ctx.userId);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = { ...parsed.data, email: parsed.data.email || undefined };
  const created = await prisma.stakeholder.create({
    data: {
      tenantId: owned.tenantId,
      contextId: owned.id,
      ...data,
    },
  });
  return NextResponse.json({ stakeholder: created });
}
