import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSignedIn } from "@/lib/require-auth";
import { suggestRedaction } from "@/lib/ai/redaction";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Schema = z.object({ content: z.string().min(1).max(8000) });

export async function POST(req: Request) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  try {
    const out = await suggestRedaction(parsed.data.content);
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: "redaction_failed", detail: String(err) },
      { status: 500 },
    );
  }
}
