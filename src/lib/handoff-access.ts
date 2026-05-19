// Centralised access logic for handoffs and per-receiver data. New code
// reads from HandoffReceiver. Legacy single-receiver rows (no receivers[])
// fall back to the Handoff.toUserId / toEmail fields for back-compat.

import type { AuthContext } from "@/lib/auth-context";

interface ReceiverLike {
  id: string;
  toUserId: string | null;
  toEmail: string | null;
  status: string;
  transferredAt: Date | null;
  acknowledgedAt: Date | null;
  includedHonestNoteIds: unknown;
}

interface HandoffLike {
  id: string;
  fromUserId: string;
  // Legacy fields kept for back-compat:
  toUserId?: string | null;
  toEmail?: string | null;
  status?: string;
  transferredAt?: Date | null;
  acknowledgedAt?: Date | null;
  includedHonestNoteIds?: unknown;
  receivers: ReceiverLike[];
}

export function isSender(handoff: HandoffLike, ctx: AuthContext): boolean {
  return !!ctx.userId && handoff.fromUserId === ctx.userId;
}

/** The HandoffReceiver row that matches the caller, if any. */
export function callerReceiver(
  handoff: HandoffLike,
  ctx: AuthContext,
): ReceiverLike | null {
  if (!ctx.userId && !ctx.email) return null;
  const match = handoff.receivers.find(
    (r) =>
      (ctx.userId && r.toUserId === ctx.userId) ||
      (ctx.email && r.toEmail && r.toEmail.toLowerCase() === ctx.email.toLowerCase()),
  );
  if (match) return match;
  // Legacy fallback — synthesize a pseudo-receiver from the parent row so
  // pre-multi-receiver handoffs still work.
  if (
    handoff.toUserId === ctx.userId ||
    (handoff.toEmail && ctx.email && handoff.toEmail.toLowerCase() === ctx.email.toLowerCase())
  ) {
    return {
      id: `legacy:${handoff.id}`,
      toUserId: handoff.toUserId ?? null,
      toEmail: handoff.toEmail ?? null,
      status: handoff.status ?? "DRAFT",
      transferredAt: handoff.transferredAt ?? null,
      acknowledgedAt: handoff.acknowledgedAt ?? null,
      includedHonestNoteIds: handoff.includedHonestNoteIds ?? [],
    };
  }
  return null;
}

export function isReceiver(handoff: HandoffLike, ctx: AuthContext): boolean {
  return callerReceiver(handoff, ctx) !== null;
}

/** Status the caller-receiver is at right now. */
export function receiverStatus(rec: ReceiverLike): "DRAFT" | "TRANSFERRED" | "ACKNOWLEDGED" {
  if (rec.status === "ACKNOWLEDGED") return "ACKNOWLEDGED";
  if (rec.status === "TRANSFERRED") return "TRANSFERRED";
  return "DRAFT";
}

/** Aggregate parent-handoff status derived from receivers (worst of). */
export function aggregateStatus(receivers: ReceiverLike[]): "DRAFT" | "READY" | "TRANSFERRED" | "ACKNOWLEDGED" {
  if (receivers.length === 0) return "DRAFT";
  if (receivers.every((r) => r.status === "ACKNOWLEDGED")) return "ACKNOWLEDGED";
  if (receivers.every((r) => r.status === "TRANSFERRED" || r.status === "ACKNOWLEDGED"))
    return "TRANSFERRED";
  return "DRAFT";
}

export function includedNoteIdsFor(rec: ReceiverLike): string[] {
  if (Array.isArray(rec.includedHonestNoteIds)) {
    return (rec.includedHonestNoteIds as unknown[]).filter(
      (s): s is string => typeof s === "string",
    );
  }
  return [];
}
