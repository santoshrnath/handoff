import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Inbox } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IncomingPage() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Sign in to see incoming handoffs.</h1>
      </div>
    );
  }
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;

  const incoming = await prisma.handoff.findMany({
    where: {
      OR: [
        { receivers: { some: { toUserId: userId } } },
        email
          ? { receivers: { some: { toEmail: { equals: email, mode: "insensitive" } } } }
          : { id: "__never__" },
        { toUserId: userId },
        email ? { toEmail: { equals: email, mode: "insensitive" } } : { id: "__never__" },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      context: { select: { id: true, title: true, type: true } },
      receivers: true,
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="h-cinematic">Incoming</h1>

      {incoming.length === 0 ? (
        <div className="card text-center">
          <Inbox className="mx-auto h-6 w-6 text-violet-200" />
          <div className="mt-2 text-sm font-medium text-white">
            Nothing incoming yet
          </div>
          <div className="mt-1 text-xs text-slate-500">
            When someone shares a handoff with your email, it&apos;ll land here.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {incoming.map((h) => {
            const mine = email
              ? h.receivers.find(
                  (r) => r.toEmail?.toLowerCase() === email.toLowerCase(),
                )
              : null;
            const status = mine?.status ?? h.status;
            return (
              <Link
                key={h.id}
                href={`/handoffs/${h.id}`}
                className="card transition hover:border-violet-glow/30"
              >
                <div className="flex items-center justify-between">
                  <span className="pill text-[10px]">{h.type.replace("_", " ")}</span>
                  <span
                    className={`pill text-[10px] ${
                      status === "TRANSFERRED"
                        ? "pill-cyan"
                        : status === "ACKNOWLEDGED"
                          ? "pill-emerald"
                          : "pill-amber"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="mt-3 text-base font-semibold text-white">
                  {h.context.title}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  From {h.fromEmail ?? "—"} · {timeAgo(h.createdAt)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
