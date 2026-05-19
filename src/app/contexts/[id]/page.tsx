import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthContext, tenantWhere } from "@/lib/auth-context";
import { ContextDetail } from "@/components/context/context-detail";

export const dynamic = "force-dynamic";

export default async function ContextDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await getAuthContext();
  const context = await prisma.context.findFirst({
    where: { id: params.id, ...tenantWhere(ctx) },
    include: {
      stakeholders: { orderBy: { createdAt: "asc" } },
      decisions: { orderBy: { createdAt: "desc" } },
      openLoops: { orderBy: { createdAt: "desc" } },
      watchOuts: { orderBy: { createdAt: "desc" } },
      honestNotes: { orderBy: { createdAt: "desc" } },
      artifacts: { orderBy: { uploadedAt: "desc" } },
      handoffs: { orderBy: { createdAt: "desc" } },
      interviews: { orderBy: { startedAt: "desc" } },
    },
  });
  if (!context) notFound();

  const isOwner = context.ownerUserId === ctx.userId;

  // Receivers and admins should not see honest notes on the context page.
  const safeContext = {
    ...context,
    honestNotes: isOwner ? context.honestNotes : [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/contexts" className="hover:text-violet-300">
          Contexts
        </Link>
        <span>›</span>
        <span className="text-slate-300">{context.title}</span>
      </div>
      <ContextDetail context={safeContext} isOwner={isOwner} />
    </div>
  );
}
