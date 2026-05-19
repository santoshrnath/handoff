import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Gate for cost-bearing or mutating endpoints (Anthropic calls, writes).
export async function requireSignedIn(): Promise<NextResponse | null> {
  const { userId } = await auth();
  if (userId) return null;
  return NextResponse.json(
    {
      error:
        "Sign in to use this feature. The AI interview, receiver Q&A, redaction tools and transfer flow use Anthropic credits and require an account.",
      code: "auth_required",
    },
    { status: 401 },
  );
}
