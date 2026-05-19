// Pre-shaped starting points. Each template can prefill the create form and
// seed stakeholder/decision skeleton on first save.

export type TemplateId =
  | "client-onboarding"
  | "project-rotation"
  | "stand-in-leave"
  | "vendor-account"
  | "stakeholder-relationship"
  | "recurring-process";

export interface Template {
  id: TemplateId;
  title: string;
  body: string;
  type: "PROJECT" | "CLIENT" | "WORKSTREAM" | "PROCESS" | "STAKEHOLDER" | "ACCOUNT";
  importance: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** Suggested context title placeholder shown in the create form. */
  titlePlaceholder: string;
  /** Pre-filled description (the user can rewrite). */
  description: string;
  /** Skeleton stakeholders seeded after creation. */
  stakeholderSkeleton: Array<{
    name: string;
    role?: string;
    relationship?:
      | "CHAMPION"
      | "ALLY"
      | "NEUTRAL"
      | "SKEPTIC"
      | "BLOCKER"
      | "INFLUENCER"
      | "DECISION_MAKER"
      | "UNKNOWN";
  }>;
  /** Watch-outs the interview will probe by default. */
  watchOutSkeleton: Array<{ topic: string; severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }>;
}

export const TEMPLATES: Record<TemplateId, Template> = {
  "client-onboarding": {
    id: "client-onboarding",
    title: "Client onboarding handoff",
    body: "Hand over a strategic client to a new account lead. Decisions, relationship dynamics, watch-outs.",
    type: "CLIENT",
    importance: "HIGH",
    titlePlaceholder: "Acme Corp — strategic account",
    description:
      "Strategic client relationship being handed to a new account lead. Capture the political read, the relationship history, what's working and what's brittle.",
    stakeholderSkeleton: [
      { name: "Primary client sponsor", role: "Executive sponsor", relationship: "DECISION_MAKER" },
      { name: "Day-to-day client contact", role: "Operational lead", relationship: "ALLY" },
      { name: "Internal account exec (you)", role: "Outgoing", relationship: "CHAMPION" },
    ],
    watchOutSkeleton: [
      { topic: "First-90-days expectations the client never wrote down", severity: "HIGH" },
      { topic: "Pricing or contract clauses that are tolerated but disputed", severity: "MEDIUM" },
    ],
  },
  "project-rotation": {
    id: "project-rotation",
    title: "Project rotation",
    body: "You're rotating off a project mid-flight. Open loops, in-flight decisions, who to ask.",
    type: "PROJECT",
    importance: "HIGH",
    titlePlaceholder: "e.g. Q1 platform migration",
    description:
      "Mid-flight project handed to an incoming lead. Document open loops, recent decisions and their rationale, and who unblocks what.",
    stakeholderSkeleton: [
      { name: "Project sponsor", role: "Sponsor", relationship: "DECISION_MAKER" },
      { name: "Technical lead", role: "Tech lead", relationship: "ALLY" },
    ],
    watchOutSkeleton: [
      { topic: "Decisions made informally that aren't in the doc trail", severity: "HIGH" },
      { topic: "Vendors mid-flight with personal trust dependencies", severity: "MEDIUM" },
    ],
  },
  "stand-in-leave": {
    id: "stand-in-leave",
    title: "Stand-in for a short leave",
    body: "You're out for 2-5 days. Five-minute interview, what the stand-in must know, what to refuse.",
    type: "WORKSTREAM",
    importance: "MEDIUM",
    titlePlaceholder: "Cover for me Thu–Fri",
    description:
      "Short stand-in coverage. Focus is the next 48–96 hours: what's in flight, who'll reach out, what the stand-in is and is not authorised to decide.",
    stakeholderSkeleton: [
      { name: "Stand-in", role: "Covering for me", relationship: "ALLY" },
    ],
    watchOutSkeleton: [
      { topic: "Approvals over a $-threshold the stand-in should NOT make", severity: "HIGH" },
    ],
  },
  "vendor-account": {
    id: "vendor-account",
    title: "Vendor account handover",
    body: "Pass a vendor relationship to a new internal owner. Quirks, tolerances, contractual edges.",
    type: "ACCOUNT",
    importance: "MEDIUM",
    titlePlaceholder: "Stripe — payments vendor",
    description:
      "Vendor relationship handed to a new internal owner. Capture pricing quirks, response patterns, escalation paths, and contractual edges that are tolerated but worth knowing.",
    stakeholderSkeleton: [
      { name: "Vendor account manager", role: "Vendor AM", relationship: "ALLY" },
      { name: "Vendor escalation contact", role: "Escalation", relationship: "INFLUENCER" },
    ],
    watchOutSkeleton: [
      { topic: "Things we've tolerated but never raised", severity: "MEDIUM" },
    ],
  },
  "stakeholder-relationship": {
    id: "stakeholder-relationship",
    title: "Single-stakeholder relationship",
    body: "How this specific person operates. The tacit relational layer, not the org chart layer.",
    type: "STAKEHOLDER",
    importance: "HIGH",
    titlePlaceholder: "Poorva — VP of Marketing",
    description:
      "A single relationship being handed off. Capture how this person actually operates: response patterns, what trips them, what wins them, how decisions emerge.",
    stakeholderSkeleton: [],
    watchOutSkeleton: [
      { topic: "Phrases or framings this person reacts badly to", severity: "MEDIUM" },
    ],
  },
  "recurring-process": {
    id: "recurring-process",
    title: "Recurring process",
    body: "A monthly close, a board pack, a quarterly review. The real path, including workarounds.",
    type: "PROCESS",
    importance: "MEDIUM",
    titlePlaceholder: "Monthly board pack",
    description:
      "Recurring process handed to a new owner. Document the real path — including workarounds, who unblocks what, and which steps are documented vs. tribal.",
    stakeholderSkeleton: [],
    watchOutSkeleton: [
      { topic: "Steps that are documented but everyone skips", severity: "MEDIUM" },
    ],
  },
};

export function getTemplate(id: string | null | undefined): Template | null {
  if (!id) return null;
  return (TEMPLATES as Record<string, Template>)[id] ?? null;
}
