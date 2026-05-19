import { Briefcase, Building2, GitBranch, User, FileBox, Workflow, Sparkles } from "lucide-react";
import Link from "next/link";

const TEMPLATES = [
  {
    id: "client-onboarding",
    title: "Client onboarding handoff",
    body: "Hand over a strategic client to a new account lead. Decisions, relationship dynamics, watch-outs.",
    icon: Building2,
    type: "CLIENT",
  },
  {
    id: "project-rotation",
    title: "Project rotation",
    body: "You're rotating off a project mid-flight. Open loops, in-flight decisions, who to ask.",
    icon: Workflow,
    type: "PROJECT",
  },
  {
    id: "stand-in-leave",
    title: "Stand-in for a short leave",
    body: "You're out for 2-5 days. Five-minute interview, what the stand-in must know, what to refuse.",
    icon: GitBranch,
    type: "WORKSTREAM",
  },
  {
    id: "vendor-account",
    title: "Vendor account handover",
    body: "Pass a vendor relationship to a new internal owner. Quirks, tolerances, contractual edges.",
    icon: FileBox,
    type: "ACCOUNT",
  },
  {
    id: "stakeholder-relationship",
    title: "Single-stakeholder relationship",
    body: "How this specific person operates. The tacit relational layer, not the org chart layer.",
    icon: User,
    type: "STAKEHOLDER",
  },
  {
    id: "recurring-process",
    title: "Recurring process",
    body: "A monthly close, a board pack, a quarterly review. The real path, including workarounds.",
    icon: Briefcase,
    type: "PROCESS",
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="h-cinematic">Templates</h1>
        <p className="mt-1 text-sm text-slate-400">
          Start from a known shape. The interview adapts to the context type
          you pick, but a template can pre-seed the structure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.id}
              href={`/contexts/new`}
              className="card group transition hover:border-violet-glow/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-400/10 text-violet-200">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-semibold text-white">{t.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-400">
                {t.body}
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
