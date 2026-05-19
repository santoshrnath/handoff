// The interrogator.
//
// Single highest-leverage feature of the product. The model is NOT writing
// the handoff — it is forcing the outgoing person to write a better one by
// asking probing questions. It must:
//   • probe vagueness ("difficult how?", "reliable enough how?")
//   • notice what was glossed over and circle back to it
//   • pace itself across phases (warm-up → core → deep-dive → wrap-up)
//   • ask one focused question per turn
//
// Design constraint from the spec (§4.8): the product loses if the model
// does the whole handoff. The system prompt below explicitly prevents that.

import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL, extractJson, extractText } from "@/lib/anthropic";
import type { InterviewPhase, ContextType } from "@prisma/client";

interface ContextSummary {
  title: string;
  type: ContextType;
  description?: string | null;
  importance?: string | null;
  knownStakeholders?: { name: string; role?: string | null }[];
  knownDecisions?: { title: string }[];
}

interface InterviewMessageInput {
  role: "user" | "assistant";
  content: string;
  phase?: InterviewPhase;
}

const SYSTEM_PROMPT = `You are the ContextBridge interrogator. Your job is to extract tacit knowledge from someone about to hand off work — knowledge they have stopped noticing because it has become automatic to them.

You are NOT writing the handoff. You are forcing them to write a better one by asking probing questions.

PROBE VAGUENESS. If they say:
  • "difficult" → ask difficult how, what was the last example
  • "good relationship" → ask what specifically makes it work, what would break it
  • "reliable enough" → ask what "enough" means, what would lose them the contract
  • "they get it" → ask gets what, what would they not get
  • "broken process" → ask which step, what happens when it breaks
  • "political" → ask who pushes back, on what, what's the underlying interest

KEEP IT TIGHT. One focused question per turn. No multi-part questions. No essays. Match the energy of their answer — short answer gets a short follow-up, long answer earns a deeper probe.

CIRCLE BACK. If they glossed over something earlier, return to it later in the session.

PHASES:
  WARM_UP   — orient. What is this? Why does it matter? Who owns it now? (3-5 turns)
  CORE      — decisions, stakeholders, open loops. The skeleton. (10-15 turns)
  DEEP_DIVE — political read, watch-outs, workarounds. The stuff people won't write down without prompting. (5-10 turns)
  WRAP_UP   — what would you wish you'd told yourself six weeks in? (2-3 turns)

You do not need to announce phase transitions. Just shift the questions.

RECEIVER FRAME. Every few turns, mentally ask: "what would the incoming person actually need that the outgoing person has not yet said?" Then ask for that. The user does not see this framing — just the question that results.

NEVER:
  • answer your own question
  • offer to "summarize" or "draft" the handoff yourself
  • lecture about handoff best practices
  • pile multiple questions into one turn
  • accept a vague answer without one follow-up probe

Output: just the next question. No greetings, no recap, no formatting, no quoted phrases unless quoting their words back to them. Plain text, one or two sentences.`;

export async function generateNextQuestion(opts: {
  context: ContextSummary;
  history: InterviewMessageInput[];
  phase: InterviewPhase;
  mode?: "full" | "stand_in";
  /** Aggregated "I wish I'd known" lessons from prior receivers across the
   * whole tenant. These bias the interrogator toward asking about gaps
   * that have actually burned receivers before. */
  learnedGaps?: string[];
}): Promise<{ question: string; suggestedPhase: InterviewPhase }> {
  const { context, history, phase, mode = "full", learnedGaps = [] } = opts;

  const contextBrief = [
    `Context: "${context.title}" (${context.type})`,
    context.description ? `Description: ${context.description}` : null,
    context.importance ? `Importance: ${context.importance}` : null,
    context.knownStakeholders?.length
      ? `Already-named stakeholders: ${context.knownStakeholders
          .map((s) => `${s.name}${s.role ? ` (${s.role})` : ""}`)
          .join(", ")}`
      : null,
    context.knownDecisions?.length
      ? `Already-logged decisions: ${context.knownDecisions
          .map((d) => d.title)
          .join("; ")}`
      : null,
    `Current phase: ${phase}`,
    `Mode: ${mode === "stand_in" ? "STAND_IN (5-minute focus on next 48 hours)" : "FULL (30-minute structured interview)"}`,
    learnedGaps.length > 0
      ? `Gaps prior receivers wished they'd known (use these to guide what to probe, but ask in the outgoing person's frame):\n${learnedGaps
          .map((g, i) => `  ${i + 1}. ${g}`)
          .join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userContent =
    history.length === 0
      ? `Begin the interview. Ground context follows.\n\n${contextBrief}\n\nAsk your opening question.`
      : `Ground context:\n${contextBrief}\n\nGiven the conversation so far, ask the next probing question. Remember: one question, plain text, follow up on vagueness.`;

  const turns: Anthropic.Messages.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  turns.push({ role: "user", content: userContent });

  const res = await anthropic().messages.create({
    model: MODEL(),
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: turns,
  });

  const question = extractText(res);
  const suggestedPhase = recommendPhase(history.length, phase, mode);
  return { question, suggestedPhase };
}

function recommendPhase(
  turnCount: number,
  current: InterviewPhase,
  mode: "full" | "stand_in",
): InterviewPhase {
  if (mode === "stand_in") {
    if (turnCount < 2) return "WARM_UP";
    if (turnCount < 6) return "CORE";
    return "WRAP_UP";
  }
  if (turnCount < 4) return "WARM_UP";
  if (turnCount < 16) return "CORE";
  if (turnCount < 26) return "DEEP_DIVE";
  return "WRAP_UP";
}

// ─── Synthesis: turn a transcript into structured records ───────────────────

export interface SynthesisOutput {
  snapshot?: {
    description?: string;
    currentPhase?: string;
    orgPosition?: string;
    processFlow?: string;
    workarounds?: string;
  };
  stakeholders?: Array<{
    name: string;
    role?: string;
    relationship?: string;
    operatingStyle?: string;
    whatTheyCareAbout?: string;
    howToWorkWithThem?: string;
    watchOuts?: string;
  }>;
  decisions?: Array<{
    title: string;
    rationale?: string;
    alternativesRejected?: string;
    whoWouldPushBack?: string;
  }>;
  openLoops?: Array<{
    title: string;
    detail?: string;
    owner?: string;
    blocker?: string;
    state?: "IN_FLIGHT" | "STUCK" | "DEFERRED" | "BLOCKED";
  }>;
  watchOuts?: Array<{
    topic: string;
    detail?: string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    triedBefore?: string;
  }>;
  honestNotes?: Array<{
    topic: string;
    content: string;
    sensitivity?: "PUBLIC" | "TEAM" | "PRIVATE" | "POLITICAL";
  }>;
}

const SYNTHESIS_PROMPT = `You are extracting structured handoff records from a transcript between an interviewer (the AI) and an outgoing person.

Be GENEROUS, not conservative. The transcript is short and the outgoing person packed information in. Pull out everything that the receiver would benefit from, even if briefly stated:

  • SNAPSHOT — synthesize a 1-2 sentence description of what this context IS from the answers (e.g. "AI hiring recommendation app for an enterprise client, with human-in-loop review by their PM"). Capture currentPhase if implied. Capture orgPosition if implied.
  • STAKEHOLDERS — every named person, even one-line mentions. Infer relationship (DECISION_MAKER / CHAMPION / ALLY / etc.) from how the outgoing person describes them. Pull whatTheyCareAbout, howToWorkWithThem, watchOuts from anywhere in the transcript that touched them.
  • DECISIONS — any choice that was made, including architectural ("AI makes recommendation, human reviews"), process ("hire only after PM signoff"), or scope. Capture rationale from context if not stated.
  • OPEN LOOPS — anything mid-flight, stuck, deferred, or "next 48 hours" matters.
  • WATCH-OUTS — what would break trust, what's been tried and failed, what the receiver could get wrong in their first two weeks. The interviewer often asks these directly — capture the answer plus reasonable severity.
  • PROCESS — how the work flows, cadences, workarounds. Pull processFlow if there's any description of how things actually get done.
  • HONEST NOTES — politically charged things, specific-person dynamics, anything hedged. Default sensitivity POLITICAL.

Rules:
  • Don't invent facts. But DO synthesize: if they said "X is the PM there" and later "speed to delivery is what X cares about", combine into one stakeholder record with both facts.
  • Don't drop a category just because the answer was one word — extract what's there.
  • If a question was asked and not answered, don't fabricate.
  • Quote sparingly; paraphrase tightly.

Return ONLY valid JSON matching the schema. Omit a top-level key only if there is genuinely nothing to put in it. No prose. No code fences.`;

export async function synthesizeTranscript(opts: {
  contextTitle: string;
  contextType: ContextType;
  transcript: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<SynthesisOutput> {
  const schema = {
    snapshot: {
      description: "string",
      currentPhase: "string",
      orgPosition: "string",
      processFlow: "string",
      workarounds: "string",
    },
    stakeholders: [
      {
        name: "string",
        role: "string",
        relationship:
          "CHAMPION | ALLY | NEUTRAL | SKEPTIC | BLOCKER | INFLUENCER | DECISION_MAKER | UNKNOWN",
        operatingStyle: "string",
        whatTheyCareAbout: "string",
        howToWorkWithThem: "string",
        watchOuts: "string",
      },
    ],
    decisions: [
      {
        title: "string",
        rationale: "string",
        alternativesRejected: "string",
        whoWouldPushBack: "string",
      },
    ],
    openLoops: [
      {
        title: "string",
        detail: "string",
        owner: "string",
        blocker: "string",
        state: "IN_FLIGHT | STUCK | DEFERRED | BLOCKED",
      },
    ],
    watchOuts: [
      {
        topic: "string",
        detail: "string",
        severity: "LOW | MEDIUM | HIGH | CRITICAL",
        triedBefore: "string",
      },
    ],
    honestNotes: [
      {
        topic: "string",
        content: "string",
        sensitivity: "PUBLIC | TEAM | PRIVATE | POLITICAL",
      },
    ],
  };

  const transcriptText = opts.transcript
    .map(
      (m) =>
        `${m.role === "assistant" ? "INTERVIEWER" : "OUTGOING"}: ${m.content}`,
    )
    .join("\n\n");

  const res = await anthropic().messages.create({
    model: MODEL(),
    max_tokens: 4000,
    system: SYNTHESIS_PROMPT,
    messages: [
      {
        role: "user",
        content: `Context: "${opts.contextTitle}" (${opts.contextType})

Transcript:
${transcriptText}

Schema to follow (omit any top-level keys with no real content):
${JSON.stringify(schema, null, 2)}

Return JSON.`,
      },
    ],
  });

  return extractJson<SynthesisOutput>(res);
}
