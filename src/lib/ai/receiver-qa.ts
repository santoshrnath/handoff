// Receiver-side Q&A.
//
// Six weeks in, the new person asks "why did we go with Vendor X?".
// Answer must:
//   • cite the source record (decision, stakeholder note, artifact)
//   • say "not captured" when it genuinely isn't, instead of hallucinating
//   • respect honest-notes redaction (caller decides what to pass in)

import { anthropic, MODEL, extractText } from "@/lib/anthropic";

interface QaSource {
  kind: "decision" | "stakeholder" | "open_loop" | "watch_out" | "honest_note" | "snapshot" | "artifact";
  id?: string;
  title: string;
  body: string;
}

const SYSTEM_PROMPT = `You are a research assistant grounded in a handoff package. Answer the incoming person's question using ONLY the provided source records.

Rules:
  • Cite which records you used by their numeric tag, e.g. [S2], [D1].
  • If the answer is not in the records, say so plainly: "Not captured in the handoff." Optionally suggest who they could ask. Do NOT guess.
  • Be tight. Two or three sentences is usually right.
  • If multiple records contradict each other, surface the contradiction.`;

export async function answerReceiverQuestion(opts: {
  question: string;
  sources: QaSource[];
}): Promise<{ answer: string; citations: Array<{ tag: string; kind: string; id?: string; title: string }> }> {
  const tagged = opts.sources.map((s, i) => {
    const tagPrefix = s.kind === "decision" ? "D" : s.kind === "stakeholder" ? "S" : s.kind === "open_loop" ? "L" : s.kind === "watch_out" ? "W" : s.kind === "honest_note" ? "H" : s.kind === "artifact" ? "A" : "C";
    return { ...s, tag: `${tagPrefix}${i + 1}` };
  });

  const block = tagged
    .map((s) => `[${s.tag}] (${s.kind}) ${s.title}\n${s.body}`)
    .join("\n\n---\n\n");

  const res = await anthropic().messages.create({
    model: MODEL(),
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Records:\n\n${block}\n\nQuestion: ${opts.question}`,
      },
    ],
  });

  const answer = extractText(res);
  const citations = tagged
    .filter((s) => answer.includes(`[${s.tag}]`))
    .map((s) => ({ tag: s.tag, kind: s.kind, id: s.id, title: s.title }));

  return { answer, citations };
}
