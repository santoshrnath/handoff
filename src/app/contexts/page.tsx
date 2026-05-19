import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAuthContext, tenantWhere } from "@/lib/auth-context";
import { auth } from "@clerk/nextjs/server";
import { Folder, Plus } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContextsPage() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Sign in to see your contexts.</h1>
        <p className="mt-1 text-sm text-slate-400">
          Contexts hold the tacit knowledge that survives a transition. Each
          one is private to you until you explicitly hand it off.
        </p>
      </div>
    );
  }
  const ctx = await getAuthContext();
  const contexts = await prisma.context.findMany({
    where: tenantWhere(ctx),
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          stakeholders: true,
          decisions: true,
          openLoops: true,
          watchOuts: true,
          handoffs: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="h-cinematic">Contexts</h1>
          <p className="mt-1 text-sm text-slate-400">
            Every handoff is built around a context: a project, client,
            workstream, process, stakeholder relationship, or account.
          </p>
        </div>
        <Link href="/contexts/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New context
        </Link>
      </div>

      {contexts.length === 0 ? (
        <div className="card text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-violet-400 shadow-glow">
            <Folder className="h-6 w-6 text-white" />
          </div>
          <div className="mt-3 text-sm font-semibold text-white">
            No contexts yet
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Start one — the AI interrogator will help pull what you know.
          </div>
          <Link href="/contexts/new" className="btn-primary mt-4 inline-flex">
            <Plus className="h-4 w-4" /> Create your first context
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {contexts.map((c) => (
            <Link
              key={c.id}
              href={`/contexts/${c.id}`}
              className="card group relative overflow-hidden transition hover:border-violet-glow/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-violet-400/10 text-violet-200">
                    <Folder className="h-4 w-4" />
                  </div>
                  <span className="pill text-[10px]">{c.type}</span>
                </div>
                <span
                  className={`pill text-[10px] ${
                    c.status === "ACTIVE"
                      ? "pill-emerald"
                      : c.status === "STANDING"
                        ? "pill-cyan"
                        : c.status === "ARCHIVED"
                          ? "pill"
                          : "pill-amber"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <div className="mt-4 text-base font-semibold text-white">
                {c.title}
              </div>
              {c.description && (
                <div className="mt-1 line-clamp-2 text-xs text-slate-400">
                  {c.description}
                </div>
              )}
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[10px]">
                <Stat n={c._count.stakeholders} label="Stake" />
                <Stat n={c._count.decisions} label="Decision" />
                <Stat n={c._count.openLoops} label="Loop" />
                <Stat n={c._count.watchOuts} label="Watch" />
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                  <span>Completeness</span>
                  <span>{c.completeness}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-violet-400"
                    style={{ width: `${c.completeness}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-slate-500">
                Updated {timeAgo(c.updatedAt)} ·{" "}
                {c._count.handoffs} handoff{c._count.handoffs === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] py-1.5">
      <div className="text-sm font-semibold tabular-nums text-white">{n}</div>
      <div className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
    </div>
  );
}
