// Per-user daily caps on AI-spending endpoints.
//
// This is a deliberate, simple circuit breaker for a public POC — not a
// billing system. Numbers are conservative; senior partners should not
// see a runaway Anthropic bill if a stranger signs up. Override via env.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AuthContext } from "@/lib/auth-context";

export type UsageKind =
  | "INTERVIEW_TURN"
  | "SYNTHESIZE"
  | "RECEIVER_QA"
  | "REDACTION_CHECK"
  | "ARTIFACT_EXTRACT";

interface Limits {
  daily: number;
}

const DEFAULTS: Record<UsageKind, Limits> = {
  INTERVIEW_TURN: { daily: 80 }, // ~3 full interviews per day
  SYNTHESIZE: { daily: 10 },
  RECEIVER_QA: { daily: 40 },
  REDACTION_CHECK: { daily: 30 },
  ARTIFACT_EXTRACT: { daily: 15 },
};

function envNum(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function limitsFor(kind: UsageKind): Limits {
  switch (kind) {
    case "INTERVIEW_TURN":
      return { daily: envNum("USAGE_CAP_INTERVIEW_TURNS_PER_DAY", DEFAULTS[kind].daily) };
    case "SYNTHESIZE":
      return { daily: envNum("USAGE_CAP_SYNTHESIZE_PER_DAY", DEFAULTS[kind].daily) };
    case "RECEIVER_QA":
      return { daily: envNum("USAGE_CAP_QA_PER_DAY", DEFAULTS[kind].daily) };
    case "REDACTION_CHECK":
      return { daily: envNum("USAGE_CAP_REDACTION_PER_DAY", DEFAULTS[kind].daily) };
    case "ARTIFACT_EXTRACT":
      return { daily: envNum("USAGE_CAP_ARTIFACT_PER_DAY", DEFAULTS[kind].daily) };
  }
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check the cap WITHOUT incrementing. Returns a JSON response if blocked.
 */
export async function enforceCap(
  ctx: AuthContext,
  kind: UsageKind,
): Promise<NextResponse | null> {
  if (!ctx.userId) {
    return NextResponse.json(
      { error: "auth_required", code: "auth_required" },
      { status: 401 },
    );
  }
  // Super-admin override — admin emails are listed in SUPER_ADMIN_EMAILS.
  if (ctx.isSuperAdmin) return null;

  // Global kill-switch.
  if (process.env.AI_DISABLED === "true") {
    return NextResponse.json(
      {
        error: "ai_disabled",
        code: "ai_disabled",
        message:
          "AI features are temporarily disabled. Try again later.",
      },
      { status: 503 },
    );
  }

  const limits = limitsFor(kind);
  const day = utcDay();
  const row = await prisma.usageCounter.findUnique({
    where: { userId_dayUtc_kind: { userId: ctx.userId, dayUtc: day, kind } },
    select: { count: true },
  });
  const used = row?.count ?? 0;
  if (used >= limits.daily) {
    return NextResponse.json(
      {
        error: "usage_cap_reached",
        code: "usage_cap_reached",
        kind,
        used,
        limit: limits.daily,
        message: `Daily limit reached (${limits.daily}/${kind}). Resets at 00:00 UTC.`,
        resetsAt: new Date(Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate() + 1,
        )).toISOString(),
      },
      { status: 429 },
    );
  }
  return null;
}

/**
 * Increment the counter after a successful AI call. Idempotent at the row
 * level via the (userId, dayUtc, kind) unique constraint. Token counts are
 * best-effort.
 */
export async function recordUsage(
  ctx: AuthContext,
  kind: UsageKind,
  tokens?: { input?: number; output?: number },
): Promise<void> {
  if (!ctx.userId) return;
  const day = utcDay();
  await prisma.usageCounter.upsert({
    where: { userId_dayUtc_kind: { userId: ctx.userId, dayUtc: day, kind } },
    create: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      dayUtc: day,
      kind,
      count: 1,
      inputTokens: tokens?.input ?? 0,
      outputTokens: tokens?.output ?? 0,
    },
    update: {
      count: { increment: 1 },
      inputTokens: { increment: tokens?.input ?? 0 },
      outputTokens: { increment: tokens?.output ?? 0 },
    },
  });
}

/** For display: current usage state for the caller across all kinds today. */
export async function todaysUsage(userId: string) {
  const day = utcDay();
  const rows = await prisma.usageCounter.findMany({
    where: { userId, dayUtc: day },
  });
  const out: Record<string, { count: number; limit: number }> = {};
  for (const kind of [
    "INTERVIEW_TURN",
    "SYNTHESIZE",
    "RECEIVER_QA",
    "REDACTION_CHECK",
    "ARTIFACT_EXTRACT",
  ] as UsageKind[]) {
    const row = rows.find((r) => r.kind === kind);
    out[kind] = {
      count: row?.count ?? 0,
      limit: limitsFor(kind).daily,
    };
  }
  return out;
}
