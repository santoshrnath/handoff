import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { BarChart3, MessageSquare, ArrowRightLeft, Folder, Lock } from "lucide-react";

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
      prisma.context.count({ where: { ownerUserId: userId } }),
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
        <Stat label="Contexts owned" value={contexts} icon={<Folder className="h-4 w-4" />} />
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
        <h2 className="text-base font-semibold">Continuity risk</h2>
        <p className="mt-1 text-xs text-slate-400">
          Org-level dashboard surfacing which roles concentrate the most
          un-handed-off tacit knowledge — coming soon.
        </p>
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
