// Redaction assist for honest notes.
//
// Lowers the barrier to writing politically honest content. The user
// always decides — we suggest, we never strip.

import { anthropic, MODEL, extractJson } from "@/lib/anthropic";

export interface RedactionSuggestion {
  risky: boolean;
  reasons: string[];
  rewritten?: string;
}

const SYSTEM_PROMPT = `You evaluate a private "honest note" written by an outgoing person before it is transferred to a receiver. Your job is to flag content that could backfire if it leaked outside the intended audience, and (only if risky) suggest a phrasing that preserves the operational insight while reducing personal exposure.

Rules:
  • Look for: named individuals discussed unfavourably, accusations of bad faith, anything that would embarrass the named person if forwarded, anything that crosses from "how they operate" into "who they are".
  • Do NOT flag content that names people in a neutral or factual way. Naming Poorva as the EVP of Marketing is fine. Saying Poorva "sandbags promotions to protect her allies" is not.
  • If risky, propose a rewrite that focuses on the dynamic ("approvals tend to stall when there is a competing internal priority") rather than the individual.
  • If safe, set risky=false and omit the rewrite.

Return JSON: { "risky": bool, "reasons": [string], "rewritten": string? }`;

export async function suggestRedaction(content: string): Promise<RedactionSuggestion> {
  const res = await anthropic().messages.create({
    model: MODEL(),
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Note text:\n\n"""\n${content}\n"""\n\nReturn JSON only.`,
      },
    ],
  });

  return extractJson<RedactionSuggestion>(res);
}
