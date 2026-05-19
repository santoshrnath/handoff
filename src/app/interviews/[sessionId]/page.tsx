import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { InterviewRoom } from "@/components/interview/interview-room";

export const dynamic = "force-dynamic";

export default async function InterviewPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const ctx = await getAuthContext();
  const session = await prisma.interviewSession.findFirst({
    where: {
      id: params.sessionId,
      startedByUserId: ctx.userId ?? "__none__",
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      context: { select: { id: true, title: true, type: true } },
    },
  });
  if (!session) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/interviews" className="hover:text-violet-300">
          Interviews
        </Link>
        <span>›</span>
        <Link
          href={`/contexts/${session.context.id}`}
          className="hover:text-violet-300"
        >
          {session.context.title}
        </Link>
      </div>
      <InterviewRoom session={session} />
    </div>
  );
}
