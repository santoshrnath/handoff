import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import {
  BarChart3,
  MessageSquare,
  ArrowRightLeft,
  Folder,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Sign in to see analytics.</h1>
      </div>
    );
  }

  const [contexts, interviews, handoffs, ackedHandoffs, honestNotes] =
    await Promise.all([
      prisma.context.findMany({
        where: { ownerUserId: userId },
        include: {
          _count: {
            select: {
              stakeholders: true,
              decisions: true,
              openLoops: true,
              watchOuts: true,
              honestNotes: true,
              handoffs: true,
              interviews: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.interviewSession.count({ where: { startedByUserId: userId } }),
      prisma.handoff.count({ where: { fromUserId: userId } }),
      prisma.handoff.count({
        where: { fromUserId: userId, status: "ACKNOWLEDGED" },
      }),
      prisma.honestNote.count({
        where: { context: { ownerUserId: userId } },
      }),
    ]);

  const ackRate =
    handoffs === 0 ? 0 : Math.round((ackedHandoffs / handoffs) * 100);

  // Continuity risk per context: weighted by importance, content density, and
  // whether anyone has actually received it.
  const ranked = contexts
    .map((c) => {
      const importanceScore =
        c.importance === "CRITICAL"
          ? 4
          : c.importance === "HIGH"
            ? 3
            : c.importance === "MEDIUM"
              ? 2
              : 1;
      const density =
        c._count.stakeholders +
        c._count.decisions +
        c._count.openLoops +
        c._count.watchOuts +
        c._count.honestNotes;
      const handoffPenalty = c._count.handoffs > 0 ? 0 : 1;
      const completenessPenalty = (100 - c.completeness) / 100;
      // Risk = how much knowledge is concentrated with the owner that hasn't
      // been transferred. Range 0..100.
      const risk = Math.min(
        100,
        Math.round(
          importanceScore *
            10 *
            (handoffPenalty + completenessPenalty + density / 25),
        ),
      );
      return { context: c, risk, density, importanceScore };
    })
    .sort((a, b) => b.risk - a.risk);

  const high = ranked.filter((r) => r.risk >= 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-cinematic">Analytics</h1>
        <p className="mt-1 text-sm text-slate-400">
          Where your tacit knowledge lives, what&apos;s been handed off, and
          what still has no successor.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Contexts owned"
          value={contexts.length}
          icon={<Folder className="h-4 w-4" />}
        />
        <Stat
          label="Interviews run"
          value={interviews}
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <Stat
          label="Handoffs sent"
          value={handoffs}
          icon={<ArrowRightLeft className="h-4 w-4" />}
        />
        <Stat
          label="Honest notes"
          value={honestNotes}
          icon={<Lock className="h-4 w-4" />}
        />
      </div>

      <div className="card">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-violet-300" />
          <h2 className="text-base font-semibold">Receiver acknowledgement rate</h2>
        </div>
        <div className="mt-3 text-3xl font-semibold tabular-nums text-white">
          {ackRate}%
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {ackedHandoffs} of {handoffs} handoffs acknowledged.
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-violet-400 to-cyan-glow"
            style={{ width: `${ackRate}%` }}
          />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          <h2 className="text-base font-semibold">Continuity risk</h2>
          <span className="pill text-[10px]">{high.length} at risk</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Score combines importance, content density, completeness, and whether
          a handoff has actually been sent. The contexts at the top are where
          your unbacked tacit knowledge is concentrated.
        </p>

        {ranked.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-slate-500">
            No contexts yet.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {ranked.map((r) => {
              const tone =
                r.risk >= 70
                  ? "rose"
                  : r.risk >= 40
                    ? "amber"
                    : "emerald";
              return (
                <Link
                  key={r.context.id}
                  href={`/contexts/${r.context.id}`}
                  className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-violet-glow/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="pill text-[10px]">{r.context.type}</span>
                      <span className="pill text-[10px]">
                        {r.context.importance}
                      </span>
                      <div className="truncate text-sm font-medium text-white">
                        {r.context.title}
                      </div>
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {r.context._count.stakeholders} stake ·{" "}
                      {r.context._count.decisions} decisions ·{" "}
                      {r.context._count.honestNotes} private notes ·{" "}
                      {r.context._count.handoffs} handoff
                      {r.context._count.handoffs === 1 ? "" : "s"} sent · Updated{" "}
                      {timeAgo(r.context.updatedAt)}
                    </div>
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <div className="mb-1 flex justify-between text-[10px]">
                      <span
                        className={cn(
                          tone === "rose"
                            ? "text-rose-200"
                            : tone === "amber"
                              ? "text-amber-200"
                              : "text-emerald-200",
                        )}
                      >
                        Risk
                      </span>
                      <span
                        className={cn(
                          "tabular-nums",
                          tone === "rose"
                            ? "text-rose-200"
                            : tone === "amber"
                              ? "text-amber-200"
                              : "text-emerald-200",
                        )}
                      >
                        {r.risk}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          tone === "rose"
                            ? "bg-gradient-to-r from-rose-500 to-rose-400"
                            : tone === "amber"
                              ? "bg-gradient-to-r from-amber-500 to-amber-400"
                              : "bg-gradient-to-r from-emerald-500 to-emerald-400",
                        )}
                        style={{ width: `${r.risk}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums text-white">
        {value}
      </div>
    </div>
  );
}
