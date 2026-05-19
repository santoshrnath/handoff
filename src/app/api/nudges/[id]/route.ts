import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

const Schema = z.object({
  status: z.enum(["DISMISSED", "ACTED"]),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const n = await prisma.nudge.findFirst({
    where: { id: params.id, forUserId: ctx.userId ?? "__none__" },
  });
  if (!n) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const updated = await prisma.nudge.update({
    where: { id: n.id },
    data: { status: parsed.data.status, resolvedAt: new Date() },
  });
  return NextResponse.json({ nudge: updated });
}
