// Artifact synthesis: read a doc, propose context updates.
//
// Helps with the blank-page problem. Outgoing person uploads emails,
// minutes, brief docs — model drafts the first cut of decisions,
// stakeholders, open loops. Human edits.

import { anthropic, MODEL, extractJson } from "@/lib/anthropic";

export interface ArtifactExtract {
  summary: string;
  proposedStakeholders?: Array<{ name: string; role?: string; signal?: string }>;
  proposedDecisions?: Array<{ title: string; rationale?: string }>;
  proposedOpenLoops?: Array<{ title: string; detail?: string }>;
  proposedWatchOuts?: Array<{ topic: string; detail?: string }>;
}

const SYSTEM = `You extract handoff-useful structure from a single artifact (an email thread, meeting notes, a brief, a status doc).

Output a short summary (1-3 sentences) and any clearly-evidenced records:
  • stakeholders (people named with a discernible role or behaviour)
  • decisions (a choice was made — capture the rationale if stated)
  • open loops (work mid-flight or stuck)
  • watch-outs (broken, dangerous, tried-and-failed)

Do not invent. Omit categories with nothing to say. Quote sparingly. Return JSON only.`;

export async function extractFromArtifact(opts: {
  fileName: string;
  text: string;
}): Promise<ArtifactExtract> {
  const schema = {
    summary: "string",
    proposedStakeholders: [{ name: "string", role: "string", signal: "string" }],
    proposedDecisions: [{ title: "string", rationale: "string" }],
    proposedOpenLoops: [{ title: "string", detail: "string" }],
    proposedWatchOuts: [{ topic: "string", detail: "string" }],
  };

  const truncated = opts.text.length > 18000 ? opts.text.slice(0, 18000) + "\n\n[...truncated]" : opts.text;

  const res = await anthropic().messages.create({
    model: MODEL(),
    max_tokens: 1500,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `File: ${opts.fileName}\n\nContent:\n${truncated}\n\nSchema:\n${JSON.stringify(schema, null, 2)}\n\nReturn JSON.`,
      },
    ],
  });

  return extractJson<ArtifactExtract>(res);
}
