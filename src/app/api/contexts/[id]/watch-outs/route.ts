import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const Schema = z.object({
  topic: z.string().min(1).max(300),
  detail: z.string().max(4000).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  triedBefore: z.string().max(4000).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const owned = await prisma.context.findFirst({
    where: { id: params.id, ownerUserId: ctx.userId ?? "__none__" },
  });
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const created = await prisma.watchOut.create({
    data: { tenantId: owned.tenantId, contextId: owned.id, ...parsed.data },
  });
  return NextResponse.json({ watchOut: created });
}
