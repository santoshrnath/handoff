import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

// Honest notes are owner-private. They never appear in a list query for
// anyone other than the owner — admins included. Receivers see them only
// via the Handoff package after explicit transfer, with redaction applied.

const Schema = z.object({
  topic: z.string().min(1).max(300),
  content: z.string().min(1).max(8000),
  sensitivity: z.enum(["PUBLIC", "TEAM", "PRIVATE", "POLITICAL"]).optional(),
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
  const created = await prisma.honestNote.create({
    data: { tenantId: owned.tenantId, contextId: owned.id, ...parsed.data },
  });
  return NextResponse.json({ honestNote: created });
}
