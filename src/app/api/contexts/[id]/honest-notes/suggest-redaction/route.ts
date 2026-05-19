import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSignedIn } from "@/lib/require-auth";
import { suggestRedaction } from "@/lib/ai/redaction";
import { getAuthContext } from "@/lib/auth-context";
import { enforceCap, recordUsage } from "@/lib/usage";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Schema = z.object({ content: z.string().min(1).max(8000) });

export async function POST(req: Request) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const rl = await enforceRateLimit(req, ctx, "ai");
  if (rl) return rl;
  const cap = await enforceCap(ctx, "REDACTION_CHECK");
  if (cap) return cap;

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  try {
    const out = await suggestRedaction(parsed.data.content);
    await recordUsage(ctx, "REDACTION_CHECK");
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: "redaction_failed", detail: String(err) },
      { status: 500 },
    );
  }
}
