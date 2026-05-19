// Simple in-memory sliding-window rate limiter, keyed by user-id or ip.
//
// Single-process only — fine for a one-container POC. For scale-out, swap
// the Map for a Redis ZSET. The cap is intentionally loose: it stops
// pathological loops, not legitimate use.

import { NextResponse } from "next/server";
import type { AuthContext } from "@/lib/auth-context";

interface Window {
  windowMs: number;
  max: number;
}

const WINDOWS: Record<string, Window> = {
  // ~20 AI turns per minute is generous for one human; anything more is a
  // bot or a hung loop.
  ai: { windowMs: 60_000, max: 20 },
  // Writes (create context, add stakeholder etc.).
  write: { windowMs: 60_000, max: 60 },
  // Reads.
  read: { windowMs: 60_000, max: 300 },
};

type Bucket = number[];
const buckets = new Map<string, Bucket>();

// Periodic GC so the Map doesn't grow forever in long-running containers.
let lastGc = Date.now();
function gc() {
  if (Date.now() - lastGc < 60_000) return;
  lastGc = Date.now();
  const cutoff = Date.now() - 5 * 60_000;
  for (const [key, b] of buckets) {
    const pruned = b.filter((t) => t > cutoff);
    if (pruned.length === 0) buckets.delete(key);
    else buckets.set(key, pruned);
  }
}

function take(key: string, win: Window): { ok: boolean; retryAfterMs: number } {
  gc();
  const now = Date.now();
  const cutoff = now - win.windowMs;
  const b = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (b.length >= win.max) {
    const retryAfterMs = Math.max(0, b[0]! + win.windowMs - now);
    buckets.set(key, b);
    return { ok: false, retryAfterMs };
  }
  b.push(now);
  buckets.set(key, b);
  return { ok: true, retryAfterMs: 0 };
}

export function ipFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function enforceRateLimit(
  req: Request,
  ctx: AuthContext,
  kind: keyof typeof WINDOWS,
): Promise<NextResponse | null> {
  const win = WINDOWS[kind];
  const id = ctx.userId ?? `ip:${ipFromRequest(req)}`;
  const key = `${kind}:${id}`;
  const { ok, retryAfterMs } = take(key, win);
  if (ok) return null;
  return NextResponse.json(
    {
      error: "rate_limited",
      code: "rate_limited",
      retryAfterMs,
      message: `Too many requests — retry in ${Math.ceil(retryAfterMs / 1000)}s.`,
    },
    {
      status: 429,
      headers: { "retry-after": String(Math.ceil(retryAfterMs / 1000)) },
    },
  );
}
