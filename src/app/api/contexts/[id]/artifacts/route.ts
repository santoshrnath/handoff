import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { requireSignedIn } from "@/lib/require-auth";
import { artifactKey, extractKey, getStorage } from "@/lib/storage";
import { extractTextFromBuffer } from "@/lib/extract-text";
import { extractFromArtifact } from "@/lib/ai/artifact-extract";
import { env } from "@/lib/env";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await requireSignedIn();
  if (gate) return gate;
  const ctx = await getAuthContext();
  const owned = await prisma.context.findFirst({
    where: { id: params.id, ownerUserId: ctx.userId ?? "__none__" },
  });
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  const maxBytes = env.uploads.maxSizeMb() * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const storage = getStorage();

  const artifact = await prisma.artifact.create({
    data: {
      tenantId: owned.tenantId,
      contextId: owned.id,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storageKey: "",
      uploadedBy: ctx.userId ?? undefined,
    },
  });

  const key = artifactKey({
    tenantId: owned.tenantId,
    contextId: owned.id,
    artifactId: artifact.id,
    fileName: file.name,
  });
  await storage.put({
    bucket: "originals",
    key,
    body: buf,
    contentType: file.type || "application/octet-stream",
  });

  let textKeyOut: string | null = null;
  let summary: string | null = null;
  let extractedJson: Prisma.InputJsonValue | null = null;

  try {
    const text = await extractTextFromBuffer(buf, file.type, file.name);
    if (text && text.length > 0) {
      const tKey = extractKey({
        tenantId: owned.tenantId,
        contextId: owned.id,
        artifactId: artifact.id,
      });
      await storage.put({
        bucket: "extracts",
        key: tKey,
        body: Buffer.from(text, "utf8"),
        contentType: "text/plain",
      });
      textKeyOut = tKey;

      try {
        const ai = await extractFromArtifact({ fileName: file.name, text });
        summary = ai.summary ?? null;
        extractedJson = ai as unknown as Prisma.InputJsonValue;
      } catch {
        // AI extraction failures shouldn't fail the upload.
      }
    }
  } catch {
    // Text extraction failures shouldn't fail the upload either — the file
    // is stored, the user just won't see an auto-summary.
  }

  const updated = await prisma.artifact.update({
    where: { id: artifact.id },
    data: {
      storageKey: key,
      textStorageKey: textKeyOut ?? undefined,
      summary: summary ?? undefined,
      extractedJson: extractedJson ?? undefined,
    },
  });

  return NextResponse.json({ artifact: updated });
}
