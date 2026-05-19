// Extract plain text from an uploaded artifact.

import mammoth from "mammoth";
// pdf-parse has a side-effect import in its index; route through main file.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export async function extractTextFromBuffer(
  buf: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const name = fileName.toLowerCase();
  if (mimeType.includes("pdf") || name.endsWith(".pdf")) {
    const r = await pdfParse(buf);
    return (r.text as string).trim();
  }
  if (
    mimeType.includes("officedocument.wordprocessingml") ||
    name.endsWith(".docx")
  ) {
    const r = await mammoth.extractRawText({ buffer: buf });
    return r.value.trim();
  }
  if (mimeType.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")) {
    return buf.toString("utf8").trim();
  }
  // Best-effort: return as utf8 if it looks textual.
  const text = buf.toString("utf8");
  if (/^[\x09\x0A\x0D\x20-\x7E]*$/.test(text.slice(0, 500))) {
    return text.trim();
  }
  return "";
}
