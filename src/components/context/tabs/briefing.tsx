"use client";

import {
  Users,
  Gavel,
  TrendingUp,
  AlertTriangle,
  Lock,
  FileBox,
  Settings,
  Workflow,
  Printer,
  Download,
  Sparkles,
} from "lucide-react";
import { cn, initials, timeAgo, formatDate } from "@/lib/utils";

type Stakeholder = {
  id: string;
  name: string;
  role: string | null;
  email?: string | null;
  relationship: string;
  operatingStyle: string | null;
  whatTheyCareAbout: string | null;
  howToWorkWithThem: string | null;
  watchOuts: string | null;
};

type Decision = {
  id: string;
  title: string;
  rationale: string | null;
  alternativesRejected: string | null;
  whoWouldPushBack: string | null;
};

type OpenLoop = {
  id: string;
  title: string;
  detail: string | null;
  owner: string | null;
  blocker: string | null;
  state: string;
};

type WatchOut = {
  id: string;
  topic: string;
  detail: string | null;
  severity: string;
  triedBefore: string | null;
};

type HonestNote = {
  id: string;
  topic: string;
  content: string;
  sensitivity: string;
};

type Artifact = {
  id: string;
  originalName: string;
  summary: string | null;
  uploadedAt: Date | string;
};

const REL_PILL: Record<string, string> = {
  CHAMPION: "pill-emerald",
  ALLY: "pill-emerald",
  NEUTRAL: "pill",
  SKEPTIC: "pill-amber",
  BLOCKER: "pill-rose",
  INFLUENCER: "pill-cyan",
  DECISION_MAKER: "pill-violet",
  UNKNOWN: "pill",
};

const STATE_PILL: Record<string, string> = {
  IN_FLIGHT: "pill-emerald",
  STUCK: "pill-amber",
  DEFERRED: "pill",
  BLOCKED: "pill-rose",
};

const SEV_PILL: Record<string, string> = {
  LOW: "pill",
  MEDIUM: "pill-amber",
  HIGH: "pill-rose",
  CRITICAL: "pill-rose",
};

const SENS_PILL: Record<string, string> = {
  PUBLIC: "pill",
  TEAM: "pill-cyan",
  PRIVATE: "pill-amber",
  POLITICAL: "pill-rose",
};

export function BriefingTab({
  context,
  isOwner,
}: {
  context: {
    id: string;
    title: string;
    type: string;
    status: string;
    importance: string;
    sensitivity: string;
    description: string | null;
    currentPhase: string | null;
    orgPosition: string | null;
    processFlow: string | null;
    workarounds: string | null;
    completeness: number;
    updatedAt: string | Date;
    stakeholders: Stakeholder[];
    decisions: Decision[];
    openLoops: OpenLoop[];
    watchOuts: WatchOut[];
    honestNotes: HonestNote[];
    artifacts: Artifact[];
    interviews: Array<{ id: string; status: string; startedAt: string | Date }>;
  };
  isOwner: boolean;
}) {
  const counts = {
    stakeholders: context.stakeholders.length,
    decisions: context.decisions.length,
    openLoops: context.openLoops.length,
    watchOuts: context.watchOuts.length,
    honestNotes: isOwner ? context.honestNotes.length : 0,
    artifacts: context.artifacts.length,
    interviews: context.interviews.length,
  };

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="card flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-400">
          One-page briefing. Everything captured for this context, scrollable
          top-to-bottom. Print for a leave-behind dossier.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="btn-ghost text-xs"
          >
            <Printer className="h-3.5 w-3.5" /> Print / save PDF
          </button>
          <button
            onClick={async () => {
              const text = renderText(context, isOwner);
              await navigator.clipboard.writeText(text);
            }}
            className="btn-ghost text-xs"
          >
            <Download className="h-3.5 w-3.5" /> Copy as text
          </button>
        </div>
      </div>

      <header className="card print:border-none print:bg-transparent print:shadow-none print:p-0">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
          {context.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="pill">{context.type}</span>
          <span
            className={cn(
              "pill",
              context.status === "ACTIVE"
                ? "pill-emerald"
                : context.status === "STANDING"
                  ? "pill-cyan"
                  : context.status === "ARCHIVED"
                    ? "pill"
                    : "pill-amber",
            )}
          >
            {context.status}
          </span>
          <span className="pill">{context.importance}</span>
          <span className="pill">{context.sensitivity}</span>
          <span className="text-slate-500">
            · Updated {timeAgo(context.updatedAt)}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
        <Tile n={counts.stakeholders} label="Stakeholders" Icon={Users} />
        <Tile n={counts.decisions} label="Decisions" Icon={Gavel} />
        <Tile n={counts.openLoops} label="Open Loops" Icon={TrendingUp} />
        <Tile n={counts.watchOuts} label="Watch-outs" Icon={AlertTriangle} />
        {isOwner && (
          <Tile n={counts.honestNotes} label="Honest Notes" Icon={Lock} />
        )}
        <Tile n={counts.artifacts} label="Artifacts" Icon={FileBox} />
        <Tile n={counts.interviews} label="Interviews" Icon={Sparkles} />
      </section>

      <Section title="Snapshot" Icon={Workflow}>
        <Field label="What this is" value={context.description} />
        <Field label="Current phase" value={context.currentPhase} />
        <Field label="Where it sits in the org" value={context.orgPosition} />
      </Section>

      <Section title="Stakeholders" Icon={Users} count={counts.stakeholders}>
        {context.stakeholders.length === 0 ? (
          <Empty>None named yet.</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 print:grid-cols-2">
            {context.stakeholders.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-[10px] font-semibold text-white">
                    {initials(s.name)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {s.name}
                    </div>
                    {s.role && (
                      <div className="text-[11px] text-slate-400">{s.role}</div>
                    )}
                  </div>
                  <span
                    className={cn(
                      "pill ml-auto text-[10px]",
                      REL_PILL[s.relationship] ?? "pill",
                    )}
                  >
                    {s.relationship.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs">
                  {s.whatTheyCareAbout && (
                    <Line label="Cares about" value={s.whatTheyCareAbout} />
                  )}
                  {s.howToWorkWithThem && (
                    <Line label="How to work with" value={s.howToWorkWithThem} />
                  )}
                  {s.operatingStyle && (
                    <Line label="Operating style" value={s.operatingStyle} />
                  )}
                  {s.watchOuts && (
                    <Line label="Watch-outs" value={s.watchOuts} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Decisions" Icon={Gavel} count={counts.decisions}>
        {context.decisions.length === 0 ? (
          <Empty>No decisions logged.</Empty>
        ) : (
          <div className="space-y-2">
            {context.decisions.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="text-sm font-medium text-white">{d.title}</div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
                  <Line label="Why" value={d.rationale} />
                  <Line label="Rejected" value={d.alternativesRejected} />
                  <Line label="Pushback from" value={d.whoWouldPushBack} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Process" Icon={Settings}>
        <Field label="How the work flows" value={context.processFlow} />
        <Field label="Workarounds" value={context.workarounds} />
      </Section>

      <Section title="Open loops" Icon={TrendingUp} count={counts.openLoops}>
        {context.openLoops.length === 0 ? (
          <Empty>Nothing mid-flight captured.</Empty>
        ) : (
          <div className="space-y-2">
            {context.openLoops.map((l) => (
              <div
                key={l.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("pill text-[10px]", STATE_PILL[l.state])}>
                    {l.state.replace("_", " ")}
                  </span>
                  <div className="text-sm font-medium text-white">{l.title}</div>
                </div>
                {l.detail && (
                  <div className="mt-1 text-xs text-slate-400">{l.detail}</div>
                )}
                <div className="mt-1 grid grid-cols-1 gap-1 text-xs md:grid-cols-2">
                  {l.owner && <Line label="Owner" value={l.owner} />}
                  {l.blocker && <Line label="Blocker" value={l.blocker} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Watch-outs"
        Icon={AlertTriangle}
        count={counts.watchOuts}
      >
        {context.watchOuts.length === 0 ? (
          <Empty>None flagged.</Empty>
        ) : (
          <div className="space-y-2">
            {context.watchOuts.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn("pill text-[10px]", SEV_PILL[w.severity])}
                  >
                    {w.severity}
                  </span>
                  <div className="text-sm font-medium text-white">{w.topic}</div>
                </div>
                {w.detail && (
                  <div className="mt-1 text-xs text-slate-400">{w.detail}</div>
                )}
                {w.triedBefore && (
                  <div className="mt-1 text-xs text-slate-500">
                    <span className="text-slate-600">Tried before: </span>
                    {w.triedBefore}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {isOwner && (
        <Section
          title="Honest notes"
          Icon={Lock}
          count={counts.honestNotes}
          tone="rose"
        >
          {context.honestNotes.length === 0 ? (
            <Empty>Nothing private captured.</Empty>
          ) : (
            <div className="space-y-2">
              {context.honestNotes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-rose-glow/20 bg-rose-glow/[0.04] p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "pill text-[10px]",
                        SENS_PILL[n.sensitivity],
                      )}
                    >
                      {n.sensitivity}
                    </span>
                    <div className="text-sm font-semibold text-white">
                      {n.topic}
                    </div>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                    {n.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      <Section title="Artifacts" Icon={FileBox} count={counts.artifacts}>
        {context.artifacts.length === 0 ? (
          <Empty>Nothing uploaded.</Empty>
        ) : (
          <div className="space-y-2">
            {context.artifacts.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="text-sm font-medium text-white">
                  {a.originalName}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  Uploaded {timeAgo(a.uploadedAt)}
                </div>
                {a.summary && (
                  <div className="mt-2 text-xs text-slate-300">{a.summary}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {context.interviews.length > 0 && (
        <Section
          title="Interview history"
          Icon={Sparkles}
          count={counts.interviews}
        >
          <div className="space-y-2">
            {context.interviews.map((i) => (
              <a
                key={i.id}
                href={`/interviews/${i.id}`}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-violet-glow/30"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    Session {i.id.slice(-6)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Started {formatDate(i.startedAt)}
                  </div>
                </div>
                <span
                  className={cn(
                    "pill text-[10px]",
                    i.status === "COMPLETED"
                      ? "pill-emerald"
                      : i.status === "IN_PROGRESS"
                        ? "pill-violet"
                        : "pill",
                  )}
                >
                  {i.status.replace("_", " ")}
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Tile({
  n,
  label,
  Icon,
}: {
  n: number;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-violet-300" />
      <div className="mt-1 text-xl font-semibold tabular-nums text-white">
        {n}
      </div>
      <div className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

function Section({
  title,
  Icon,
  count,
  tone = "default",
  children,
}: {
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  count?: number;
  tone?: "default" | "rose";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "card",
        tone === "rose" && "border-rose-glow/20 bg-rose-glow/[0.02]",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "rose" ? "text-rose-300" : "text-violet-300",
          )}
        />
        <h2 className="text-base font-semibold">{title}</h2>
        {typeof count === "number" && (
          <span className="pill text-[10px]">{count}</span>
        )}
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
        {value || <span className="text-slate-500">Not captured.</span>}
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="text-xs leading-relaxed text-slate-300">
      <span className="text-slate-500">{label}: </span>
      {value}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center text-xs text-slate-500">
      {children}
    </div>
  );
}

function renderText(
  context: Parameters<typeof BriefingTab>[0]["context"],
  isOwner: boolean,
): string {
  const lines: string[] = [];
  lines.push(`# ${context.title}`);
  lines.push(`${context.type} · ${context.status} · ${context.importance}`);
  lines.push("");

  if (context.description || context.currentPhase || context.orgPosition) {
    lines.push("## Snapshot");
    if (context.description) lines.push(`- What this is: ${context.description}`);
    if (context.currentPhase) lines.push(`- Current phase: ${context.currentPhase}`);
    if (context.orgPosition) lines.push(`- Org position: ${context.orgPosition}`);
    lines.push("");
  }

  if (context.stakeholders.length > 0) {
    lines.push("## Stakeholders");
    for (const s of context.stakeholders) {
      lines.push(
        `- ${s.name}${s.role ? ` (${s.role})` : ""} — ${s.relationship.replace("_", " ")}`,
      );
      if (s.whatTheyCareAbout) lines.push(`  · Cares about: ${s.whatTheyCareAbout}`);
      if (s.howToWorkWithThem) lines.push(`  · How to work with: ${s.howToWorkWithThem}`);
      if (s.watchOuts) lines.push(`  · Watch-outs: ${s.watchOuts}`);
    }
    lines.push("");
  }

  if (context.decisions.length > 0) {
    lines.push("## Decisions");
    for (const d of context.decisions) {
      lines.push(`- ${d.title}`);
      if (d.rationale) lines.push(`  · Why: ${d.rationale}`);
      if (d.alternativesRejected) lines.push(`  · Rejected: ${d.alternativesRejected}`);
      if (d.whoWouldPushBack) lines.push(`  · Pushback: ${d.whoWouldPushBack}`);
    }
    lines.push("");
  }

  if (context.processFlow || context.workarounds) {
    lines.push("## Process");
    if (context.processFlow) lines.push(`- Flow: ${context.processFlow}`);
    if (context.workarounds) lines.push(`- Workarounds: ${context.workarounds}`);
    lines.push("");
  }

  if (context.openLoops.length > 0) {
    lines.push("## Open loops");
    for (const l of context.openLoops) {
      lines.push(`- [${l.state.replace("_", " ")}] ${l.title}`);
      if (l.detail) lines.push(`  · ${l.detail}`);
      if (l.owner) lines.push(`  · Owner: ${l.owner}`);
      if (l.blocker) lines.push(`  · Blocker: ${l.blocker}`);
    }
    lines.push("");
  }

  if (context.watchOuts.length > 0) {
    lines.push("## Watch-outs");
    for (const w of context.watchOuts) {
      lines.push(`- [${w.severity}] ${w.topic}`);
      if (w.detail) lines.push(`  · ${w.detail}`);
      if (w.triedBefore) lines.push(`  · Tried before: ${w.triedBefore}`);
    }
    lines.push("");
  }

  if (isOwner && context.honestNotes.length > 0) {
    lines.push("## Honest notes (private — owner view)");
    for (const n of context.honestNotes) {
      lines.push(`- [${n.sensitivity}] ${n.topic}`);
      lines.push(`  ${n.content}`);
    }
    lines.push("");
  }

  if (context.artifacts.length > 0) {
    lines.push("## Artifacts");
    for (const a of context.artifacts) {
      lines.push(`- ${a.originalName}`);
      if (a.summary) lines.push(`  · ${a.summary}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
