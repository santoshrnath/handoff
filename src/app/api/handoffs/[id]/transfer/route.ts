import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";
import { handoffEmailTemplate, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Schema = z.object({
  // Optional: transfer only a specific receiver (e.g. just-added). Defaults
  // to transferring every DRAFT receiver on the handoff.
  receiverId: z.string().optional(),
});

// Confirms transfer to each DRAFT receiver. Honest-note redaction is frozen
// at this point (no retroactive expansion). Emails each receiver with a
// templated message and their unique share token.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();

  const handoff = await prisma.handoff.findFirst({
    where: { id: params.id, fromUserId: ctx.userId ?? "__none__" },
    include: {
      context: { select: { title: true, type: true } },
      receivers: true,
    },
  });
  if (!handoff) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const drafts = handoff.receivers.filter((r) => r.status === "DRAFT");
  const target = parsed.data.receiverId
    ? drafts.filter((r) => r.id === parsed.data.receiverId)
    : drafts;

  if (target.length === 0) {
    return NextResponse.json({ ok: true, transferred: 0 });
  }

  const now = new Date();
  const emailResults: Array<{
    receiverId: string;
    toEmail: string | null;
    ok: boolean;
    skipped: boolean;
    detail?: string;
  }> = [];

  for (const rec of target) {
    await prisma.handoffReceiver.update({
      where: { id: rec.id },
      data: { status: "TRANSFERRED", transferredAt: now },
    });

    if (rec.toEmail) {
      const noteIds = Array.isArray(rec.includedHonestNoteIds)
        ? (rec.includedHonestNoteIds as string[])
        : [];
      const tpl = handoffEmailTemplate({
        fromName: rec.toName ?? null,
        fromEmail: handoff.fromEmail,
        contextTitle: handoff.context.title,
        contextType: handoff.context.type,
        handoffType: handoff.type,
        handoffId: handoff.id,
        packageNote: handoff.packageNote,
        honestNoteCount: noteIds.length,
      });
      const result = await sendEmail({
        to: rec.toEmail,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
      emailResults.push({ receiverId: rec.id, toEmail: rec.toEmail, ...result });
    } else {
      emailResults.push({
        receiverId: rec.id,
        toEmail: null,
        ok: false,
        skipped: true,
        detail: "no email",
      });
    }
  }

  // Bump the parent Handoff aggregate fields for legacy code paths.
  await prisma.handoff.update({
    where: { id: handoff.id },
    data: { transferredAt: now, status: "TRANSFERRED" },
  });

  return NextResponse.json({
    ok: true,
    transferred: target.length,
    emails: emailResults,
  });
}
