import Link from "next/link";
import {
  Briefcase,
  Building2,
  GitBranch,
  User,
  FileBox,
  Workflow,
  Sparkles,
} from "lucide-react";
import { TEMPLATES, type TemplateId } from "@/lib/templates";

const ICONS: Record<TemplateId, React.ComponentType<{ className?: string }>> = {
  "client-onboarding": Building2,
  "project-rotation": Workflow,
  "stand-in-leave": GitBranch,
  "vendor-account": FileBox,
  "stakeholder-relationship": User,
  "recurring-process": Briefcase,
};

export default function TemplatesPage() {
  const items = Object.values(TEMPLATES);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-cinematic">Templates</h1>
        <p className="mt-1 text-sm text-slate-400">
          Start from a known shape. The template pre-fills type, description,
          importance — and seeds a stakeholder skeleton + likely watch-outs
          you can edit before the AI interview.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => {
          const Icon = ICONS[t.id];
          return (
            <Link
              key={t.id}
              href={`/contexts/new?template=${t.id}`}
              className="card group transition hover:border-violet-glow/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-400/10 text-violet-200">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-semibold text-white">{t.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-400">
                {t.body}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                <span className="pill">{t.type}</span>
                <span className="pill">{t.importance}</span>
                {t.stakeholderSkeleton.length > 0 && (
                  <span className="pill-violet">
                    {t.stakeholderSkeleton.length} stakeholder skeleton
                  </span>
                )}
                {t.watchOutSkeleton.length > 0 && (
                  <span className="pill-amber">
                    {t.watchOutSkeleton.length} watch-out
                  </span>
                )}
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-violet-200">
                <Sparkles className="h-3 w-3" /> Use this template
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
