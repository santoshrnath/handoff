import { auth, currentUser } from "@clerk/nextjs/server";
import { ShieldCheck, KeyRound, Mail, Building } from "lucide-react";
import { DataActions } from "@/components/settings/data-actions";

export const dynamic = "force-dynamic";

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
