// Nudge generation: cheap, deterministic rules that surface "anything to
// update on X?" prompts on the dashboard. Standing contexts that haven't
// been touched in a while get a refresh nudge.

import { prisma } from "@/lib/prisma";

const STANDING_REFRESH_DAYS = 14;

/**
 * For a given user, ensure there is at most one open STANDING_REFRESH nudge
 * per stale standing context. Cheap — runs on dashboard load.
 */
export async function refreshStandingNudges(opts: {
  userId: string;
  tenantId: string;
}): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STANDING_REFRESH_DAYS);

  const standingContexts = await prisma.context.findMany({
    where: {
      ownerUserId: opts.userId,
      status: "STANDING",
      updatedAt: { lt: cutoff },
    },
    select: { id: true, title: true },
  });

  if (standingContexts.length === 0) return;

  // Find which already have a pending nudge so we don't duplicate.
  const existing = await prisma.nudge.findMany({
    where: {
      forUserId: opts.userId,
      status: "PENDING",
      kind: "STANDING_REFRESH",
      contextId: { in: standingContexts.map((c) => c.id) },
    },
    select: { contextId: true },
  });
  const have = new Set(existing.map((n) => n.contextId));

  const toCreate = standingContexts.filter((c) => !have.has(c.id));
  if (toCreate.length === 0) return;

  await prisma.nudge.createMany({
    data: toCreate.map((c) => ({
      tenantId: opts.tenantId,
      forUserId: opts.userId,
      kind: "STANDING_REFRESH" as const,
      contextId: c.id,
      title: c.title,
      prompt: `Anything to update on "${c.title}"? It's been two weeks since the last edit.`,
      cta: "Add a micro-update",
    })),
  });
}
