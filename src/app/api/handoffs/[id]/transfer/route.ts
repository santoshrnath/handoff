import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";
import { handoffEmailTemplate, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Confirms the transfer. From this point, the named receiver can see the
// handoff package (incl. the included honest notes). No retroactive expansion.
// Also emails the receiver — graceful no-op if Resend isn't configured.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();

  const found = await prisma.handoff.findFirst({
    where: { id: params.id, fromUserId: ctx.userId ?? "__none__" },
    include: {
      context: { select: { title: true, type: true } },
    },
  });
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (found.status === "TRANSFERRED" || found.status === "ACKNOWLEDGED") {
    return NextResponse.json({ handoff: found });
  }

  const updated = await prisma.handoff.update({
    where: { id: params.id },
    data: { status: "TRANSFERRED", transferredAt: new Date() },
  });

  // Best-effort email notification.
  let emailStatus: { ok: boolean; skipped: boolean; detail?: string } = {
    ok: false,
    skipped: true,
    detail: "no recipient",
  };
  if (found.toEmail) {
    const honestNoteIds = Array.isArray(found.includedHonestNoteIds)
      ? (found.includedHonestNoteIds as string[])
      : [];
    const tpl = handoffEmailTemplate({
      fromName: null,
      fromEmail: found.fromEmail,
      contextTitle: found.context.title,
      contextType: found.context.type,
      handoffType: found.type,
      handoffId: found.id,
      packageNote: found.packageNote,
      honestNoteCount: honestNoteIds.length,
    });
    emailStatus = await sendEmail({
      to: found.toEmail,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
  }

  return NextResponse.json({ handoff: updated, email: emailStatus });
}
