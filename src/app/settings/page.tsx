import { auth, currentUser } from "@clerk/nextjs/server";
import { ShieldCheck, KeyRound, Mail, Building, Gauge } from "lucide-react";
import { DataActions } from "@/components/settings/data-actions";
import { todaysUsage } from "@/lib/usage";
import { getAuthContext } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const USAGE_LABELS: Record<string, string> = {
  INTERVIEW_TURN: "Interview turns",
  SYNTHESIZE: "Synthesize runs",
  RECEIVER_QA: "Receiver Q&A",
  REDACTION_CHECK: "Redaction checks",
  ARTIFACT_EXTRACT: "Artifact extracts",
};

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Sign in to manage settings.</h1>
      </div>
    );
  }
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const ctx = await getAuthContext();
  const usage = ctx.userId ? await todaysUsage(ctx.userId) : null;

  return (
    <div className="space-y-6">
      <h1 className="h-cinematic">Settings</h1>

      <section className="card">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-violet-300" />
          <h2 className="text-base font-semibold">Account</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Row
            label="Signed in as"
            value={email ?? "—"}
            icon={<Mail className="h-3.5 w-3.5" />}
          />
          <Row
            label="User id"
            value={userId}
            icon={<Building className="h-3.5 w-3.5" />}
          />
        </div>
      </section>

      <section className="card">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          <h2 className="text-base font-semibold">Trust &amp; redaction</h2>
        </div>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
          <li>
            <span className="text-emerald-300">●</span> Honest notes are private
            until you explicitly include them in a transfer.
          </li>
          <li>
            <span className="text-emerald-300">●</span> Per-receiver redaction:
            each transfer chooses which notes go.
          </li>
          <li>
            <span className="text-emerald-300">●</span> No retroactive access —
            once redacted out, the receiver never sees it.
          </li>
          <li>
            <span className="text-emerald-300">●</span> AI redaction suggestions
            never act on their own; you decide.
          </li>
        </ul>
      </section>

      {usage && (
        <section className="card">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-cyan-glow" />
            <h2 className="text-base font-semibold">
              Today&apos;s AI usage
            </h2>
            {ctx.isSuperAdmin && (
              <span className="pill text-[10px]">Admin · uncapped</span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            POC daily caps reset at 00:00 UTC. Caps are intentionally
            conservative — they stop runaway loops and bot abuse, not
            legitimate use. Email the admin for a raise.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(usage).map(([kind, u]) => {
              const pct = u.limit === 0 ? 0 : Math.min(100, Math.round((u.count / u.limit) * 100));
              const tone =
                pct >= 90
                  ? "rose"
                  : pct >= 60
                    ? "amber"
                    : "emerald";
              return (
                <div
                  key={kind}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">
                      {USAGE_LABELS[kind] ?? kind}
                    </span>
                    <span className="tabular-nums text-slate-400">
                      {u.count} / {u.limit}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        tone === "rose"
                          ? "bg-gradient-to-r from-rose-500 to-rose-400"
                          : tone === "amber"
                            ? "bg-gradient-to-r from-amber-500 to-amber-400"
                            : "bg-gradient-to-r from-emerald-500 to-emerald-400",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <DataActions />
    </div>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 break-all text-sm text-slate-200">{value}</div>
    </div>
  );
}
