import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAuthContext, tenantWhere } from "@/lib/auth-context";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  Folder,
  ArrowRightLeft,
  Clock,
  Plus,
  Sparkles,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { NewHandoffButton } from "@/components/dashboard/new-handoff-button";
import { LandingHero } from "@/components/dashboard/landing-hero";
import { NudgesPanel } from "@/components/dashboard/nudges-panel";
import { refreshStandingNudges } from "@/lib/nudges";

export const dynamic = "force-dynamic";

const TYPE_TONES: Record<string, string> = {
  PROJECT: "from-violet-500/30 to-violet-400/10 text-violet-200",
  CLIENT: "from-cyan-500/30 to-cyan-400/10 text-cyan-200",
  WORKSTREAM: "from-emerald-500/30 to-emerald-400/10 text-emerald-200",
  PROCESS: "from-amber-500/30 to-amber-400/10 text-amber-200",
  STAKEHOLDER: "from-rose-500/30 to-rose-400/10 text-rose-200",
  ACCOUNT: "from-fuchsia-500/30 to-fuchsia-400/10 text-fuchsia-200",
};

export default async function HomePage() {
  const { userId } = await auth();
  if (!userId) return <LandingHero />;

  const ctx = await getAuthContext();
  const user = await currentUser();
  const firstName = user?.firstName ?? user?.username ?? "there";

  // Lazy: surface any standing-context refresh nudges before we read the
  // table below. Cheap idempotent insert.
  if (ctx.userId) {
    await refreshStandingNudges({ userId: ctx.userId, tenantId: ctx.tenantId });
  }

  const [contexts, handoffs, interviewCount, nudges] = await Promise.all([
    prisma.context.findMany({
      where: tenantWhere(ctx),
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        _count: { select: { stakeholders: true, decisions: true, openLoops: true } },
      },
    }),
    prisma.handoff.findMany({
      where: {
        OR: [
          { fromUserId: ctx.userId ?? "__none__" },
          { toUserId: ctx.userId ?? "__none__" },
          ctx.email ? { toEmail: ctx.email } : { id: "__never__" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { context: { select: { title: true } } },
    }),
    prisma.interviewSession.count({
      where: {
        startedByUserId: ctx.userId ?? "__none__",
        status: { in: ["IN_PROGRESS", "PENDING"] },
      },
    }),
    prisma.nudge.findMany({
      where: { forUserId: ctx.userId ?? "__none__", status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const activeContexts = contexts.length;
  const totalHandoffs = await prisma.handoff.count({
    where: { fromUserId: ctx.userId ?? "__none__" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="h-cinematic">
            Good {greeting()}, {firstName}{" "}
            <span className="text-2xl">👋</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Here&apos;s what&apos;s happening with your handoffs today.
          </p>
        </div>
        <NewHandoffButton />
      </div>

      {nudges.length > 0 && (
        <NudgesPanel
          nudges={nudges.map((n) => ({
            id: n.id,
            kind: n.kind,
            title: n.title,
            prompt: n.prompt,
            cta: n.cta,
            contextId: n.contextId,
          }))}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Active Contexts"
          value={activeContexts}
          icon={<Folder className="h-4 w-4" />}
          tone="violet"
        />
        <StatCard
          label="Handoffs Created"
          value={totalHandoffs}
          icon={<ArrowRightLeft className="h-4 w-4" />}
          tone="emerald"
        />
        <StatCard
          label="Open Interviews"
          value={interviewCount}
          icon={<MessageSquare className="h-4 w-4" />}
          tone="cyan"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Recent contexts
            </h2>
            <Link
              href="/contexts"
              className="text-xs font-medium text-violet-300 hover:text-violet-200"
            >
              View all →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {contexts.length === 0 ? (
              <EmptyState
                title="No contexts yet"
                body="Create one to capture what would die in your transition."
              />
            ) : (
              contexts.map((c) => (
                <Link
                  key={c.id}
                  href={`/contexts/${c.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${
                      TYPE_TONES[c.type] ?? TYPE_TONES.PROJECT
                    }`}
                  >
                    <Folder className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold text-white">
                        {c.title}
                      </div>
                      <span className="pill text-[10px]">{c.type}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {c.type.charAt(0) + c.type.slice(1).toLowerCase()} ·{" "}
                      Updated {timeAgo(c.updatedAt)} ·{" "}
                      {c._count.stakeholders} stakeholders ·{" "}
                      {c._count.decisions} decisions
                    </div>
                  </div>
                  <div className="hidden w-32 flex-shrink-0 md:block">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Completeness</span>
                      <span>{c.completeness}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all"
                        style={{ width: `${c.completeness}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:text-violet-300" />
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Upcoming handoffs
              </h2>
              <Link
                href="/handoffs"
                className="text-xs font-medium text-violet-300 hover:text-violet-200"
              >
                View all →
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {handoffs.length === 0 ? (
                <EmptyState
                  title="No handoffs yet"
                  body="Start one from any context."
                />
              ) : (
                handoffs.map((h) => (
                  <Link
                    key={h.id}
                    href={`/handoffs/${h.id}`}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/15"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-violet-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">
                        {h.type
                          .replace("_", " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </div>
                      <div className="truncate text-xs text-slate-400">
                        {h.context.title}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {timeAgo(h.createdAt)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <Link
            href="/contexts/new"
            className="card relative block overflow-hidden transition hover:border-violet-glow/40"
          >
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-violet-glow/20 blur-3xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Start a context
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Let the AI interrogator pull what you know.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-violet-200">
                  <Plus className="h-3.5 w-3.5" /> New context
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-violet-400 shadow-glow">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "violet" | "emerald" | "cyan";
}) {
  const toneCls =
    tone === "violet"
      ? "from-violet-500/30 to-violet-400/10"
      : tone === "emerald"
        ? "from-emerald-500/30 to-emerald-400/10"
        : "from-cyan-500/30 to-cyan-400/10";
  return (
    <div className="card relative overflow-hidden">
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${toneCls} opacity-60 blur-2xl`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
            {icon}
            {label}
          </div>
          <div className="mt-2 text-4xl font-semibold text-white tabular-nums">
            {value}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-300">
            <Clock className="h-3 w-3" />
            <span className="text-slate-400">tracked this month</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
      <div className="text-sm font-medium text-slate-200">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{body}</div>
    </div>
  );
}
