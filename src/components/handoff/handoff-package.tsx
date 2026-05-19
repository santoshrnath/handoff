"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  Users,
  Gavel,
  TrendingUp,
  AlertTriangle,
  Lock,
  Check,
  ArrowRightLeft,
  FileText,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { cn, initials, timeAgo } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type Receiver = {
  id: string;
  toEmail: string | null;
  toName: string | null;
  toUserId: string | null;
  audienceLabel: string | null;
  status: string;
  includedHonestNoteIds: string[];
  createdAt: string;
  transferredAt: string | null;
  acknowledgedAt: string | null;
};

type Handoff = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  transferredAt: string | null;
  acknowledgedAt: string | null;
  fromEmail: string | null;
  toEmail: string | null;
  packageNote: string | null;
  receivers: Receiver[];
  context: {
    id: string;
    title: string;
    type: string;
    description: string | null;
    currentPhase: string | null;
    orgPosition: string | null;
    processFlow: string | null;
    workarounds: string | null;
    stakeholders: Array<{
      id: string;
      name: string;
      role: string | null;
      relationship: string;
      whatTheyCareAbout: string | null;
      howToWorkWithThem: string | null;
      watchOuts: string | null;
    }>;
    decisions: Array<{
      id: string;
      title: string;
      rationale: string | null;
      alternativesRejected: string | null;
      whoWouldPushBack: string | null;
    }>;
    openLoops: Array<{
      id: string;
      title: string;
      detail: string | null;
      owner: string | null;
      state: string;
      blocker: string | null;
    }>;
    watchOuts: Array<{
      id: string;
      topic: string;
      detail: string | null;
      severity: string;
      triedBefore: string | null;
    }>;
    artifacts: Array<{
      id: string;
      originalName: string;
      summary: string | null;
      uploadedAt: Date | string;
    }>;
  };
};

type Note = { id: string; topic: string; content: string; sensitivity: string };

type QA = {
  id: string;
  question: string;
  answer: string;
  citations: unknown;
  createdAt: string;
};

type RealityCheckItemKind =
  | "STAKEHOLDER"
  | "DECISION"
  | "OPEN_LOOP"
  | "WATCH_OUT"
  | "PROCESS"
  | "SNAPSHOT";

type RealityCheckStatus = "CONFIRMED" | "UNCLEAR" | "OUTDATED";

type RealityCheckMap = Array<{
  itemKind: RealityCheckItemKind;
  itemId: string;
  status: RealityCheckStatus;
  note: string | null;
  receiverId?: string | null;
}>;

type Tab = "overview" | "ask" | "compare" | "feedback" | "receivers";

export function HandoffPackage({
  handoff,
  honestNotes,
  qa: initialQa,
  realityChecks: initialRealityChecks,
  callerReceiverId,
  isSender,
  isReceiver,
}: {
  handoff: Handoff;
  honestNotes: Note[];
  qa: QA[];
  realityChecks: RealityCheckMap;
  callerReceiverId: string | null;
  isSender: boolean;
  isReceiver: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [qa, setQa] = useState<QA[]>(initialQa);
  const [realityChecks, setRealityChecks] =
    useState<RealityCheckMap>(initialRealityChecks);
  const [askInput, setAskInput] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [ackBusy, setAckBusy] = useState(false);

  async function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    setAskBusy(true);
    setAskInput("");
    try {
      const res = await fetch(`/api/handoffs/${handoff.id}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed");
      }
      const { qa: created } = await res.json();
      setQa((cur) => [
        { ...created, createdAt: new Date(created.createdAt).toISOString() },
        ...cur,
      ]);
    } catch (err) {
      toast.error(
        "Couldn't answer",
        String(err instanceof Error ? err.message : err),
      );
    } finally {
      setAskBusy(false);
    }
  }

  async function acknowledge() {
    setAckBusy(true);
    try {
      const res = await fetch(`/api/handoffs/${handoff.id}/acknowledge`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("ack_failed");
      toast.success("Handoff acknowledged");
      router.refresh();
    } catch (err) {
      toast.error(
        "Acknowledgement failed",
        String(err instanceof Error ? err.message : err),
      );
      setAckBusy(false);
    }
  }

  const suggested = [
    "What are the biggest risks I should know about?",
    "Who are the key stakeholders and how do they operate?",
    "What decisions were made and why?",
    "What's currently stuck or blocked?",
  ];

  return (
    <div className="space-y-4">
      <header className="card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-400 shadow-glow">
                <ArrowRightLeft className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold">
                {isReceiver ? "Incoming handoff" : "Outgoing handoff"}
              </h1>
              <span
                className={cn(
                  "pill text-[10px]",
                  handoff.status === "TRANSFERRED"
                    ? "pill-cyan"
                    : handoff.status === "ACKNOWLEDGED"
                      ? "pill-emerald"
                      : "pill-amber",
                )}
              >
                {handoff.status}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {handoff.type.replace("_", " ")} ·{" "}
              {handoff.fromEmail ? `From ${handoff.fromEmail}` : "From you"}
              {handoff.receivers.length > 0
                ? ` · ${handoff.receivers.length} receiver${handoff.receivers.length === 1 ? "" : "s"}`
                : handoff.toEmail
                  ? ` · To ${handoff.toEmail}`
                  : ""}
              {" · "}
              {timeAgo(handoff.createdAt)}
            </div>
          </div>
          {(() => {
            const mine = callerReceiverId
              ? handoff.receivers.find((r) => r.id === callerReceiverId)
              : null;
            const myStatus = mine?.status ?? handoff.status;
            if (!isReceiver || myStatus !== "TRANSFERRED") return null;
            return (
              <button
                onClick={acknowledge}
                disabled={ackBusy}
                className="btn-primary text-xs"
              >
                {ackBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Acknowledge receipt
              </button>
            );
          })()}
        </div>

        {handoff.packageNote && (
          <div className="mt-4 rounded-xl border border-violet-glow/20 bg-violet-glow/[0.04] p-3 text-xs text-violet-100">
            <div className="font-semibold">Note from sender:</div>
            <div className="mt-1 whitespace-pre-wrap text-violet-200/80">
              {handoff.packageNote}
            </div>
          </div>
        )}

        <nav className="mt-5 flex items-center gap-1 overflow-x-auto border-b border-white/5 scrollbar-thin">
          {(
            [
              ["overview", "Overview"],
              ["ask", "Ask Questions"],
              ["compare", "Reality Check"],
              ["feedback", "Feedback"],
              ...(isSender ? [["receivers", "Receivers"] as const] : []),
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "tab whitespace-nowrap",
                tab === id && "tab-active",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "overview" && (
        <div className="space-y-4">
          <Section title="Snapshot" icon={<FileText className="h-4 w-4" />}>
            <Field label="What this is" value={handoff.context.description} />
            <Field label="Current phase" value={handoff.context.currentPhase} />
            <Field label="Org position" value={handoff.context.orgPosition} />
          </Section>

          <Section title="Stakeholders" icon={<Users className="h-4 w-4" />}>
            {handoff.context.stakeholders.length === 0 ? (
              <Empty>None named.</Empty>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {handoff.context.stakeholders.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-[10px] font-semibold text-white">
                        {initials(s.name)}
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {s.name}
                      </div>
                      <span className="pill text-[9px]">
                        {s.relationship.replace("_", " ")}
                      </span>
                    </div>
                    {s.role && (
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {s.role}
                      </div>
                    )}
                    {s.whatTheyCareAbout && (
                      <div className="mt-2 text-xs text-slate-300">
                        <span className="text-slate-500">Cares about: </span>
                        {s.whatTheyCareAbout}
                      </div>
                    )}
                    {s.howToWorkWithThem && (
                      <div className="mt-1 text-xs text-slate-300">
                        <span className="text-slate-500">How to work with: </span>
                        {s.howToWorkWithThem}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Decisions" icon={<Gavel className="h-4 w-4" />}>
            {handoff.context.decisions.length === 0 ? (
              <Empty>No decisions logged.</Empty>
            ) : (
              <div className="space-y-2">
                {handoff.context.decisions.map((d) => (
                  <div key={d.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="text-sm font-medium text-white">{d.title}</div>
                    {d.rationale && (
                      <div className="mt-1 text-xs text-slate-400">
                        <span className="text-slate-500">Why: </span>
                        {d.rationale}
                      </div>
                    )}
                    {d.alternativesRejected && (
                      <div className="mt-1 text-xs text-slate-400">
                        <span className="text-slate-500">Rejected: </span>
                        {d.alternativesRejected}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Open loops" icon={<TrendingUp className="h-4 w-4" />}>
            {handoff.context.openLoops.length === 0 ? (
              <Empty>No open loops.</Empty>
            ) : (
              <div className="space-y-2">
                {handoff.context.openLoops.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="pill text-[10px]">{l.state.replace("_", " ")}</span>
                      <div className="text-sm font-medium text-white">{l.title}</div>
                    </div>
                    {l.detail && (
                      <div className="mt-1 text-xs text-slate-400">{l.detail}</div>
                    )}
                    {l.blocker && (
                      <div className="mt-1 text-xs text-amber-200">
                        <span className="text-slate-500">Blocker: </span>
                        {l.blocker}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Watch-outs" icon={<AlertTriangle className="h-4 w-4" />}>
            {handoff.context.watchOuts.length === 0 ? (
              <Empty>None flagged.</Empty>
            ) : (
              <div className="space-y-2">
                {handoff.context.watchOuts.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "pill text-[10px]",
                          w.severity === "CRITICAL" || w.severity === "HIGH"
                            ? "pill-rose"
                            : w.severity === "MEDIUM"
                              ? "pill-amber"
                              : "pill",
                        )}
                      >
                        {w.severity}
                      </span>
                      <div className="text-sm font-medium text-white">{w.topic}</div>
                    </div>
                    {w.detail && (
                      <div className="mt-1 text-xs text-slate-400">{w.detail}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {honestNotes.length > 0 && (
            <Section
              title="Honest notes (transferred)"
              icon={<Lock className="h-4 w-4 text-rose-300" />}
            >
              <div className="space-y-2">
                {honestNotes.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl border border-rose-glow/20 bg-rose-glow/[0.04] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="pill-rose text-[10px]">{n.sensitivity}</span>
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
              <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-200">
                <ShieldCheck className="h-3 w-3" />
                Transferred under the trust layer — no retroactive expansion.
              </div>
            </Section>
          )}
        </div>
      )}

      {tab === "ask" && (
        <div className="card">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <h2 className="text-base font-semibold">Ask the handoff</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Get cited answers from the records. If something isn&apos;t captured,
            the model says so — it doesn&apos;t guess.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <input
              value={askInput}
              onChange={(e) => setAskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ask(askInput);
                }
              }}
              placeholder="Ask anything about this context…"
              className="input flex-1"
              disabled={askBusy}
            />
            <button
              onClick={() => ask(askInput)}
              disabled={askBusy || !askInput.trim()}
              className="btn-primary"
            >
              {askBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-4">
            <div className="label">Suggested questions</div>
            <div className="flex flex-wrap gap-2">
              {suggested.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  disabled={askBusy}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 hover:border-violet-glow/30 hover:bg-violet-glow/10 hover:text-violet-100"
                >
                  › {q}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {qa.length === 0 ? (
              <Empty>No questions yet. Ask one above.</Empty>
            ) : (
              qa.map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div className="text-sm font-medium text-violet-100">
                    Q: {q.question}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                    {q.answer}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500">
                    {timeAgo(q.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "compare" && (
        <RealityCheckTab
          handoff={handoff}
          realityChecks={realityChecks}
          onChange={setRealityChecks}
          isReceiver={isReceiver}
        />
      )}

      {tab === "feedback" && isReceiver && (
        <FeedbackTab handoffId={handoff.id} />
      )}
      {tab === "feedback" && !isReceiver && (
        <div className="card text-sm text-slate-400">
          Only the receiver can leave feedback.
        </div>
      )}

      {tab === "receivers" && isSender && (
        <ReceiversTab handoff={handoff} honestNotes={honestNotes} />
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
        {value || <span className="text-slate-500">Not captured.</span>}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-slate-500">
      {children}
    </div>
  );
}

function RealityCheckTab({
  handoff,
  realityChecks,
  onChange,
  isReceiver,
}: {
  handoff: Handoff;
  realityChecks: RealityCheckMap;
  onChange: (next: RealityCheckMap) => void;
  isReceiver: boolean;
}) {
  const toast = useToast();
  const checkFor = (kind: RealityCheckItemKind, id: string) =>
    realityChecks.find((r) => r.itemKind === kind && r.itemId === id);

  async function mark(
    kind: RealityCheckItemKind,
    id: string,
    status: RealityCheckStatus,
  ) {
    try {
      const res = await fetch(`/api/handoffs/${handoff.id}/reality-check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemKind: kind, itemId: id, status }),
      });
      if (!res.ok) throw new Error("Failed");
      const next: RealityCheckMap = [
        ...realityChecks.filter(
          (r) => !(r.itemKind === kind && r.itemId === id),
        ),
        { itemKind: kind, itemId: id, status, note: null },
      ];
      onChange(next);
    } catch (err) {
      toast.error(
        "Couldn't save",
        String(err instanceof Error ? err.message : err),
      );
    }
  }

  const items: Array<{
    kind: RealityCheckItemKind;
    id: string;
    title: string;
    sub?: string;
  }> = [
    ...handoff.context.stakeholders.map((s) => ({
      kind: "STAKEHOLDER" as const,
      id: s.id,
      title: s.name,
      sub: s.role ?? undefined,
    })),
    ...handoff.context.decisions.map((d) => ({
      kind: "DECISION" as const,
      id: d.id,
      title: d.title,
      sub: d.rationale ?? undefined,
    })),
    ...handoff.context.openLoops.map((l) => ({
      kind: "OPEN_LOOP" as const,
      id: l.id,
      title: l.title,
      sub: l.state,
    })),
    ...handoff.context.watchOuts.map((w) => ({
      kind: "WATCH_OUT" as const,
      id: w.id,
      title: w.topic,
      sub: w.severity,
    })),
  ];

  const counts = {
    CONFIRMED: realityChecks.filter((r) => r.status === "CONFIRMED").length,
    UNCLEAR: realityChecks.filter((r) => r.status === "UNCLEAR").length,
    OUTDATED: realityChecks.filter((r) => r.status === "OUTDATED").length,
    UNMARKED: items.length - realityChecks.length,
  };

  if (!isReceiver) {
    return (
      <div className="card">
        <h2 className="text-base font-semibold">Reality check</h2>
        <p className="mt-1 text-xs text-slate-400">
          The receiver marks each item against ground truth as they learn it.
          Here&apos;s the current state of their checks:
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[10px]">
          <Stat n={counts.CONFIRMED} label="Confirmed" tone="emerald" />
          <Stat n={counts.UNCLEAR} label="Unclear" tone="amber" />
          <Stat n={counts.OUTDATED} label="Outdated" tone="rose" />
          <Stat n={counts.UNMARKED} label="Unmarked" tone="slate" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-base font-semibold">Reality check</h2>
      <p className="mt-0.5 text-xs text-slate-400">
        As you learn the ground truth, tag each item: it matches reality, it&apos;s
        unclear and needs more digging, or it&apos;s already outdated.
      </p>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[10px]">
        <Stat n={counts.CONFIRMED} label="Confirmed" tone="emerald" />
        <Stat n={counts.UNCLEAR} label="Unclear" tone="amber" />
        <Stat n={counts.OUTDATED} label="Outdated" tone="rose" />
        <Stat n={counts.UNMARKED} label="Unmarked" tone="slate" />
      </div>
      <div className="mt-5 space-y-2">
        {items.map((it) => {
          const c = checkFor(it.kind, it.id);
          return (
            <div
              key={`${it.kind}-${it.id}`}
              className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="pill text-[10px]">
                    {it.kind.replace("_", " ")}
                  </span>
                  <div className="truncate text-sm font-medium text-white">
                    {it.title}
                  </div>
                </div>
                {it.sub && (
                  <div className="mt-0.5 truncate text-[10px] text-slate-500">
                    {it.sub}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5">
                {(
                  [
                    ["CONFIRMED", "Confirmed", "emerald"],
                    ["UNCLEAR", "Unclear", "amber"],
                    ["OUTDATED", "Outdated", "rose"],
                  ] as const
                ).map(([s, label, tone]) => {
                  const active = c?.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => mark(it.kind, it.id, s)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-medium transition",
                        active
                          ? tone === "emerald"
                            ? "border-emerald-glow/40 bg-emerald-glow/15 text-emerald-100"
                            : tone === "amber"
                              ? "border-amber-400/40 bg-amber-400/15 text-amber-100"
                              : "border-rose-glow/40 bg-rose-glow/15 text-rose-100"
                          : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <Empty>This handoff has no items to check yet.</Empty>
        )}
      </div>
    </div>
  );
}

function Stat({
  n,
  label,
  tone,
}: {
  n: number;
  label: string;
  tone: "emerald" | "amber" | "rose" | "slate";
}) {
  const toneCls =
    tone === "emerald"
      ? "border-emerald-glow/30 bg-emerald-glow/10 text-emerald-200"
      : tone === "amber"
        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
        : tone === "rose"
          ? "border-rose-glow/30 bg-rose-glow/10 text-rose-200"
          : "border-white/10 bg-white/[0.03] text-slate-300";
  return (
    <div className={cn("rounded-lg border px-2 py-1.5", toneCls)}>
      <div className="text-sm font-semibold tabular-nums">{n}</div>
      <div className="mt-0.5 text-[9px] uppercase tracking-[0.12em] opacity-80">
        {label}
      </div>
    </div>
  );
}

function FeedbackTab({ handoffId }: { handoffId: string }) {
  const toast = useToast();
  const [content, setContent] = useState("");
  const [daysIn, setDaysIn] = useState<number>(30);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function submit() {
    if (!content.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/handoffs/${handoffId}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          daysIn,
          content: content.trim(),
          gapFlag: true,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setOk(true);
      setContent("");
      toast.success("Gap logged", "Thanks — this feeds the question library.");
    } catch (err) {
      toast.error(
        "Feedback didn't save",
        String(err instanceof Error ? err.message : err),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="text-base font-semibold">&ldquo;I wish I&apos;d known&rdquo;</h2>
      <p className="mt-0.5 text-xs text-slate-400">
        At 30 / 60 / 90 days, log gaps. This signal feeds the question library
        so future receivers don&apos;t hit the same wall.
      </p>
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDaysIn(d)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                daysIn === d
                  ? "border-violet-glow/40 bg-violet-glow/10 text-violet-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300",
              )}
            >
              {d} days in
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="What's the gap? What would you tell future-you?"
          className="input resize-none"
        />
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-slate-500">
            {ok ? "Saved — thank you." : ""}
          </div>
          <button
            onClick={submit}
            disabled={busy || !content.trim()}
            className="btn-primary text-xs"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Log gap
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiversTab({
  handoff,
  honestNotes,
}: {
  handoff: Handoff;
  honestNotes: Note[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newAudience, setNewAudience] = useState("");
  const [newNoteIds, setNewNoteIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggleNewNote(id: string) {
    setNewNoteIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addAndTransfer() {
    if (!newEmail.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/handoffs/${handoff.id}/receivers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          toEmail: newEmail.trim(),
          audienceLabel: newAudience.trim() || undefined,
          includedHonestNoteIds: Array.from(newNoteIds),
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed");
      }
      const { receiver } = await r.json();
      const t = await fetch(`/api/handoffs/${handoff.id}/transfer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ receiverId: receiver.id }),
      });
      if (!t.ok) {
        const j = await t.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to transfer");
      }
      toast.success("Receiver added & notified");
      setAdding(false);
      setNewEmail("");
      setNewAudience("");
      setNewNoteIds(new Set());
      router.refresh();
    } catch (err) {
      toast.error(
        "Couldn't add",
        String(err instanceof Error ? err.message : err),
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke(receiverId: string) {
    if (!confirm("Remove this receiver before they're notified?")) return;
    try {
      const r = await fetch(
        `/api/handoffs/${handoff.id}/receivers/${receiverId}`,
        { method: "DELETE" },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message ?? j.error ?? "Couldn't remove");
      }
      toast.success("Receiver removed");
      router.refresh();
    } catch (err) {
      toast.error(
        "Remove failed",
        String(err instanceof Error ? err.message : err),
      );
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-300" />
            <h2 className="text-base font-semibold">Receivers</h2>
            <span className="pill text-[10px]">{handoff.receivers.length}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Each receiver has their own redaction, status, share link, and
            private Q&amp;A / reality-check stream. They don&apos;t see each
            other.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="btn-ghost text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add receiver
          </button>
        )}
      </div>

      {adding && (
        <div className="mt-4 space-y-3 rounded-xl border border-violet-glow/30 bg-violet-glow/[0.04] p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@company.com"
              className="input md:col-span-2"
              autoFocus
            />
            <input
              value={newAudience}
              onChange={(e) => setNewAudience(e.target.value)}
              placeholder="audience label (optional)"
              className="input"
            />
          </div>
          {honestNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                <Lock className="h-3 w-3 text-rose-300" />
                Honest notes for this receiver
                <span className="text-rose-200/70">
                  ({newNoteIds.size}/{honestNotes.length})
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1.5 md:grid-cols-2">
                {honestNotes.map((n) => (
                  <label
                    key={n.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs",
                      newNoteIds.has(n.id)
                        ? "border-violet-glow/40 bg-violet-glow/[0.08]"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={newNoteIds.has(n.id)}
                      onChange={() => toggleNewNote(n.id)}
                      className="mt-0.5 h-3.5 w-3.5 accent-violet-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-white">
                        {n.topic}
                      </div>
                      <div className="text-[9px] uppercase tracking-[0.12em] text-rose-200">
                        {n.sensitivity}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setAdding(false);
                setNewEmail("");
                setNewAudience("");
                setNewNoteIds(new Set());
              }}
              className="btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              onClick={addAndTransfer}
              disabled={busy || !newEmail.trim()}
              className="btn-primary text-xs"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Add & notify
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {handoff.receivers.length === 0 ? (
          <Empty>No receivers yet.</Empty>
        ) : (
          handoff.receivers.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-medium text-white">
                      {r.toEmail ?? "—"}
                    </div>
                    {r.audienceLabel && (
                      <span className="pill text-[10px]">
                        {r.audienceLabel}
                      </span>
                    )}
                    <span
                      className={cn(
                        "pill text-[10px]",
                        r.status === "ACKNOWLEDGED"
                          ? "pill-emerald"
                          : r.status === "TRANSFERRED"
                            ? "pill-cyan"
                            : "pill-amber",
                      )}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {r.includedHonestNoteIds.length} honest note
                    {r.includedHonestNoteIds.length === 1 ? "" : "s"} included ·{" "}
                    Added {timeAgo(r.createdAt)}
                    {r.transferredAt
                      ? ` · Transferred ${timeAgo(r.transferredAt)}`
                      : ""}
                    {r.acknowledgedAt
                      ? ` · Ack'd ${timeAgo(r.acknowledgedAt)}`
                      : ""}
                  </div>
                </div>
                {r.status === "DRAFT" && (
                  <button
                    onClick={() => revoke(r.id)}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:border-rose-glow/30 hover:bg-rose-glow/10 hover:text-rose-200"
                  >
                    <Trash2 className="mr-1 inline h-3 w-3" /> Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
