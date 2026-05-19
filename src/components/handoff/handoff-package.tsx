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
} from "lucide-react";
import { cn, initials, timeAgo } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

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

type Tab = "overview" | "ask" | "compare" | "feedback";

export function HandoffPackage({
  handoff,
  honestNotes,
  qa: initialQa,
  isSender,
  isReceiver,
}: {
  handoff: Handoff;
  honestNotes: Note[];
  qa: QA[];
  isSender: boolean;
  isReceiver: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [qa, setQa] = useState<QA[]>(initialQa);
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
              {handoff.toEmail ? ` · To ${handoff.toEmail}` : ""}
              {" · "}
              {timeAgo(handoff.createdAt)}
            </div>
          </div>
          {isReceiver && handoff.status === "TRANSFERRED" && (
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
          )}
        </div>

        {handoff.packageNote && (
          <div className="mt-4 rounded-xl border border-violet-glow/20 bg-violet-glow/[0.04] p-3 text-xs text-violet-100">
            <div className="font-semibold">Note from sender:</div>
            <div className="mt-1 whitespace-pre-wrap text-violet-200/80">
              {handoff.packageNote}
            </div>
          </div>
        )}

        <nav className="mt-5 flex items-center gap-1 border-b border-white/5">
          {(
            [
              ["overview", "Overview"],
              ["ask", "Ask Questions"],
              ["compare", "Reality Check"],
              ["feedback", "Feedback"],
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
        <div className="card">
          <h2 className="text-base font-semibold">Reality check</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            As you learn the ground truth, mark items as confirmed, unclear, or
            outdated. (Coming soon — for now, capture &lsquo;I wish I&apos;d
            known&rsquo; entries via the Feedback tab.)
          </p>
        </div>
      )}

      {tab === "feedback" && isReceiver && (
        <FeedbackTab handoffId={handoff.id} />
      )}
      {tab === "feedback" && !isReceiver && (
        <div className="card text-sm text-slate-400">
          Only the receiver can leave feedback.
        </div>
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
