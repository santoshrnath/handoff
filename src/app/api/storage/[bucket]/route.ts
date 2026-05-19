import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getAuthContext } from "@/lib/auth-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Streams a stored object back. Only the artifact's tenant owner can read.
export async function GET(
  req: Request,
  { params }: { params: { bucket: string } },
) {
  const ctx = await getAuthContext();
  const bucket = params.bucket === "originals" ? "originals" : "extracts";
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "no_key" }, { status: 400 });

  const artifact = await prisma.artifact.findFirst({
    where: {
      OR: [{ storageKey: key }, { textStorageKey: key }],
    },
  });
  if (!artifact) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!ctx.canSeeAllTenants && artifact.tenantId !== ctx.tenantId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const data = await getStorage().get(key, bucket);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": artifact.mimeType ?? "application/octet-stream",
      "content-disposition": `inline; filename="${artifact.originalName}"`,
    },
  });
}
