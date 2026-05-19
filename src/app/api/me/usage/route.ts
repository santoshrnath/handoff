import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-context";
import { todaysUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx.userId) {
    return NextResponse.json({ usage: null });
  }
  const usage = await todaysUsage(ctx.userId);
  return NextResponse.json({ usage, isSuperAdmin: ctx.isSuperAdmin });
}
