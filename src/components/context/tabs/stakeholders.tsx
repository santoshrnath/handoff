"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Trash2, Users } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm";

type S = {
  id: string;
  name: string;
  role: string | null;
  email?: string | null;
  relationship: string;
  whatTheyCareAbout: string | null;
  howToWorkWithThem: string | null;
  watchOuts: string | null;
  operatingStyle: string | null;
};

const RELATIONSHIPS = [
  "CHAMPION",
  "ALLY",
  "NEUTRAL",
  "SKEPTIC",
  "BLOCKER",
  "INFLUENCER",
  "DECISION_MAKER",
  "UNKNOWN",
] as const;

const REL_PILL: Record<string, string> = {
  CHAMPION: "pill-emerald",
  ALLY: "pill-emerald",
  NEUTRAL: "pill",
  SKEPTIC: "pill-amber",
  BLOCKER: "pill-rose",
  INFLUENCER: "pill-cyan",
  DECISION_MAKER: "pill-violet",
  UNKNOWN: "pill",
};

export function StakeholdersTab({
  contextId,
  stakeholders,
  isOwner,
}: {
  contextId: string;
  stakeholders: S[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Stakeholders</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            People who matter in this context — and how they actually operate.
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setAdding(true)}
            className="btn-ghost text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add stakeholder
          </button>
        )}
      </div>

      {adding && isOwner && (
        <NewStakeholderRow
          contextId={contextId}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {stakeholders.length === 0 && !adding ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-violet-glow/15">
            <Users className="h-5 w-5 text-violet-200" />
          </div>
          <div className="mt-2 text-sm font-medium text-white">
            No stakeholders captured
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Run the AI interview or add them manually.
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="py-2 pr-3">Stakeholder</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Cares about</th>
                <th className="py-2 pr-3">How to work with</th>
                <th className="py-2 pr-3">Relationship</th>
                {isOwner && <th className="w-8"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stakeholders.map((s) => (
                <tr key={s.id} className="align-top">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/20 text-xs font-semibold text-white">
                        {initials(s.name)}
                      </div>
                      <div className="font-medium text-white">{s.name}</div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-slate-300">
                    {s.role ?? "—"}
                  </td>
                  <td className="py-3 pr-3 text-slate-400">
                    {s.whatTheyCareAbout ?? "—"}
                  </td>
                  <td className="py-3 pr-3 text-slate-400">
                    {s.howToWorkWithThem ?? "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <span className={cn("pill text-[10px]", REL_PILL[s.relationship])}>
                      {s.relationship.replace("_", " ")}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="py-3">
                      <DeleteBtn
                        url={`/api/contexts/${contextId}/stakeholders/${s.id}`}
                        onDone={() => router.refresh()}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewStakeholderRow({
  contextId,
  onDone,
  onCancel,
}: {
  contextId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [whatTheyCareAbout, setWhat] = useState("");
  const [howToWorkWithThem, setHow] = useState("");
  const [relationship, setRel] = useState<typeof RELATIONSHIPS[number]>("UNKNOWN");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/contexts/${contextId}/stakeholders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role: role || undefined,
          whatTheyCareAbout: whatTheyCareAbout || undefined,
          howToWorkWithThem: howToWorkWithThem || undefined,
          relationship,
        }),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-violet-glow/30 bg-violet-glow/[0.04] p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="input"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role (e.g. VP of Product)"
          className="input"
        />
        <input
          value={whatTheyCareAbout}
          onChange={(e) => setWhat(e.target.value)}
          placeholder="What they care about"
          className="input"
        />
        <input
          value={howToWorkWithThem}
          onChange={(e) => setHow(e.target.value)}
          placeholder="How to work with them"
          className="input"
        />
        <select
          value={relationship}
          onChange={(e) => setRel(e.target.value as typeof RELATIONSHIPS[number])}
          className="input md:col-span-2"
        >
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>
              {r.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost text-xs">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={busy || !name.trim()}
          className="btn-primary text-xs"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </button>
      </div>
    </div>
  );
}

export function DeleteBtn({
  url,
  onDone,
  label = "this entry",
}: {
  url: string;
  onDone: () => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  return (
    <button
      onClick={async () => {
        const ok = await confirm({
          title: `Delete ${label}?`,
          description: "This can't be undone.",
          confirmLabel: "Delete",
          tone: "danger",
        });
        if (!ok) return;
        setBusy(true);
        await fetch(url, { method: "DELETE" });
        onDone();
      }}
      disabled={busy}
      className="rounded-lg border border-white/5 p-1.5 text-slate-500 hover:border-rose-glow/30 hover:bg-rose-glow/10 hover:text-rose-300"
      title="Delete"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}
