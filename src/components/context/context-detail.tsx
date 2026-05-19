"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Share2,
  Users,
  Gavel,
  Workflow,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Lock,
  FileBox,
  Settings,
  Plus,
  Trash2,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { BriefingTab } from "./tabs/briefing";
import { StakeholdersTab } from "./tabs/stakeholders";
import { DecisionsTab } from "./tabs/decisions";
import { ProcessTab } from "./tabs/process";
import { OpenLoopsTab } from "./tabs/open-loops";
import { WatchOutsTab } from "./tabs/watch-outs";
import { HonestNotesTab } from "./tabs/honest-notes";
import { SnapshotTab } from "./tabs/snapshot";
import { ArtifactsTab } from "./tabs/artifacts";
import { ShareDialog } from "./share-dialog";
import { LayoutDashboard } from "lucide-react";

type Tab =
  | "briefing"
  | "snapshot"
  | "decisions"
  | "stakeholders"
  | "process"
  | "open-loops"
  | "watch-outs"
  | "honest-notes"
  | "artifacts";

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "briefing", label: "Briefing", icon: LayoutDashboard },
  { id: "snapshot", label: "Snapshot", icon: Workflow },
  { id: "decisions", label: "Decisions", icon: Gavel },
  { id: "stakeholders", label: "Stakeholders", icon: Users },
  { id: "process", label: "Process", icon: Settings },
  { id: "open-loops", label: "Open Loops", icon: TrendingUp },
  { id: "watch-outs", label: "Watch-outs", icon: AlertTriangle },
  { id: "honest-notes", label: "Honest Notes", icon: Lock },
  { id: "artifacts", label: "Artifacts", icon: FileBox },
];

type Ctx = {
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
  stakeholders: Parameters<typeof StakeholdersTab>[0]["stakeholders"];
  decisions: Parameters<typeof DecisionsTab>[0]["decisions"];
  openLoops: Parameters<typeof OpenLoopsTab>[0]["openLoops"];
  watchOuts: Parameters<typeof WatchOutsTab>[0]["watchOuts"];
  honestNotes: Parameters<typeof HonestNotesTab>[0]["honestNotes"];
  artifacts: Parameters<typeof ArtifactsTab>[0]["artifacts"];
  handoffs: Array<{ id: string; type: string; status: string; createdAt: string | Date }>;
  interviews: Array<{ id: string; status: string; startedAt: string | Date }>;
};

export function ContextDetail({
  context,
  isOwner,
}: {
  context: Ctx;
  isOwner: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("briefing");
  const [shareOpen, setShareOpen] = useState(false);
  const [interviewBusy, setInterviewBusy] = useState(false);

  async function startInterview(mode: "full" | "stand_in") {
    setInterviewBusy(true);
    try {
      const res = await fetch(`/api/contexts/${context.id}/interviews`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to start interview");
      }
      const { session } = await res.json();
      router.push(`/interviews/${session.id}`);
    } catch (err) {
      toast.error(
        "Could not start interview",
        String(err instanceof Error ? err.message : err),
      );
      setInterviewBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
                {context.title}
              </h1>
              <span
                className={cn(
                  "pill text-[10px]",
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
              <span className="pill text-[10px]">{context.type}</span>
              <span className="pill text-[10px]">{context.importance}</span>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Updated {timeAgo(context.updatedAt)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && (
              <>
                <button
                  onClick={() => startInterview("stand_in")}
                  disabled={interviewBusy}
                  className="btn-ghost text-xs"
                  title="5-minute interview for the next 48 hours"
                >
                  {interviewBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Stand-in (5 min)
                </button>
                <button
                  onClick={() => startInterview("full")}
                  disabled={interviewBusy}
                  className="btn-primary text-xs"
                >
                  {interviewBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Run AI interview
                </button>
                <button
                  onClick={() => setShareOpen(true)}
                  className="btn-ghost text-xs"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share handoff
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex justify-between text-[10px] text-slate-500">
            <span>Completeness</span>
            <span>{context.completeness}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-violet-400 to-cyan-glow transition-all"
              style={{ width: `${context.completeness}%` }}
            />
          </div>
        </div>

        <nav className="mt-6 flex items-center gap-1 overflow-x-auto border-b border-white/5 pb-px scrollbar-thin">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            // hide honest notes tab from non-owners (admins included)
            if (t.id === "honest-notes" && !isOwner) return null;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "tab inline-flex items-center gap-1.5 whitespace-nowrap",
                  active && "tab-active",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <section>
        {tab === "briefing" && (
          <BriefingTab context={context} isOwner={isOwner} />
        )}
        {tab === "snapshot" && (
          <SnapshotTab context={context} isOwner={isOwner} />
        )}
        {tab === "decisions" && (
          <DecisionsTab
            contextId={context.id}
            decisions={context.decisions}
            isOwner={isOwner}
          />
        )}
        {tab === "stakeholders" && (
          <StakeholdersTab
            contextId={context.id}
            stakeholders={context.stakeholders}
            isOwner={isOwner}
          />
        )}
        {tab === "process" && (
          <ProcessTab context={context} isOwner={isOwner} />
        )}
        {tab === "open-loops" && (
          <OpenLoopsTab
            contextId={context.id}
            openLoops={context.openLoops}
            isOwner={isOwner}
          />
        )}
        {tab === "watch-outs" && (
          <WatchOutsTab
            contextId={context.id}
            watchOuts={context.watchOuts}
            isOwner={isOwner}
          />
        )}
        {tab === "honest-notes" && isOwner && (
          <HonestNotesTab
            contextId={context.id}
            honestNotes={context.honestNotes}
          />
        )}
        {tab === "artifacts" && (
          <ArtifactsTab
            contextId={context.id}
            artifacts={context.artifacts}
            isOwner={isOwner}
          />
        )}
      </section>

      {shareOpen && (
        <ShareDialog
          contextId={context.id}
          honestNotes={context.honestNotes}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Floating helper if no interview yet */}
      {isOwner && context.interviews.length === 0 && (
        <div className="card relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-violet-glow/20 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-400 shadow-glow">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Run the AI interview
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  20-30 minutes. The interrogator probes vagueness so the
                  receiver doesn&apos;t have to.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-stretch md:self-auto">
              <button
                onClick={() => startInterview("full")}
                disabled={interviewBusy}
                className="btn-primary text-xs"
              >
                Start interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
