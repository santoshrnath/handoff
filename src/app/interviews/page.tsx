import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { MessageSquare, Sparkles } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Sign in to see your interviews.</h1>
      </div>
    );
  }

  const sessions = await prisma.interviewSession.findMany({
    where: { startedByUserId: userId },
    orderBy: { startedAt: "desc" },
    include: {
      context: { select: { id: true, title: true, type: true } },
      _count: { select: { messages: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="h-cinematic">My interviews</h1>

      {sessions.length === 0 ? (
        <div className="card text-center">
          <Sparkles className="mx-auto h-6 w-6 text-violet-200" />
          <div className="mt-2 text-sm font-medium text-white">
            No interviews yet
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Start one from any context. Use stand-in mode if you&apos;ve only got
            five minutes.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/interviews/${s.id}`}
              className="card group transition hover:border-violet-glow/30"
            >
              <div className="flex items-center justify-between">
                <span className="pill text-[10px]">
                  {s.mode === "stand_in" ? "Stand-in" : "Full"}
                </span>
                <span
                  className={`pill text-[10px] ${
                    s.status === "COMPLETED"
                      ? "pill-emerald"
                      : s.status === "IN_PROGRESS"
                        ? "pill-violet"
                        : "pill"
                  }`}
                >
                  {s.status.replace("_", " ")}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-violet-300" />
                <div className="text-base font-semibold text-white">
                  {s.context.title}
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {s._count.messages} message{s._count.messages === 1 ? "" : "s"} ·{" "}
                {s.phase.replace("_", " ")} · {timeAgo(s.startedAt)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
