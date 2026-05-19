import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ArrowRightLeft, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HandoffsPage() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Sign in to see your handoffs.</h1>
      </div>
    );
  }
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;

  const [outgoing, incoming] = await Promise.all([
    prisma.handoff.findMany({
      where: { fromUserId: userId },
      orderBy: { createdAt: "desc" },
      include: { context: { select: { id: true, title: true, type: true } } },
    }),
    prisma.handoff.findMany({
      where: {
        OR: [
          { toUserId: userId },
          email ? { toEmail: email } : { id: "__never__" },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { context: { select: { id: true, title: true, type: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="h-cinematic">Handoffs</h1>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-violet-300" />
          <h2 className="text-sm font-semibold tracking-tight">Outgoing</h2>
          <span className="pill text-[10px]">{outgoing.length}</span>
        </div>
        <List items={outgoing} kind="outgoing" />
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <ArrowDownLeft className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-semibold tracking-tight">Incoming</h2>
          <span className="pill text-[10px]">{incoming.length}</span>
        </div>
        <List items={incoming} kind="incoming" />
      </section>
    </div>
  );
}

function List({
  items,
  kind,
}: {
  items: Array<{
    id: string;
    type: string;
    status: string;
    createdAt: Date | string;
    toEmail: string | null;
    context: { id: string; title: string; type: string };
  }>;
  kind: "outgoing" | "incoming";
}) {
  if (items.length === 0) {
    return (
      <div className="card text-sm text-slate-500">
        {kind === "outgoing"
          ? "No handoffs sent yet. From any context, click ‘Share handoff’."
          : "No incoming handoffs. They'll appear when someone names you as the receiver."}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((h) => (
        <Link
          key={h.id}
          href={`/handoffs/${h.id}`}
          className="card group transition hover:border-violet-glow/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-glow/15">
                <ArrowRightLeft className="h-3.5 w-3.5 text-violet-200" />
              </div>
              <span className="pill text-[10px]">{h.type.replace("_", " ")}</span>
            </div>
            <span
              className={`pill text-[10px] ${
                h.status === "TRANSFERRED"
                  ? "pill-cyan"
                  : h.status === "ACKNOWLEDGED"
                    ? "pill-emerald"
                    : h.status === "READY"
                      ? "pill-amber"
                      : "pill"
              }`}
            >
              {h.status}
            </span>
          </div>
          <div className="mt-3 text-base font-semibold text-white">
            {h.context.title}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {kind === "outgoing"
              ? `To ${h.toEmail ?? "—"}`
              : "Receiver mode"}{" "}
            · {timeAgo(h.createdAt)}
          </div>
        </Link>
      ))}
    </div>
  );
}
