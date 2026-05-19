"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";

export function SnapshotTab({
  context,
  isOwner,
}: {
  context: {
    id: string;
    description: string | null;
    currentPhase: string | null;
    orgPosition: string | null;
    importance: string;
    status: string;
    sensitivity: string;
  };
  isOwner: boolean;
}) {
  const router = useRouter();
  const [description, setDescription] = useState(context.description ?? "");
  const [currentPhase, setCurrentPhase] = useState(context.currentPhase ?? "");
  const [orgPosition, setOrgPosition] = useState(context.orgPosition ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await fetch(`/api/contexts/${context.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description: description || null,
          currentPhase: currentPhase || null,
          orgPosition: orgPosition || null,
        }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!isOwner) {
    return (
      <div className="card space-y-4">
        <Field label="Description" value={context.description} />
        <Field label="Current phase" value={context.currentPhase} />
        <Field label="Org position" value={context.orgPosition} />
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div>
        <label className="label">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="input resize-none"
          placeholder="What is this, in two or three sentences?"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label">Current phase</label>
          <input
            value={currentPhase}
            onChange={(e) => setCurrentPhase(e.target.value)}
            className="input"
            placeholder="e.g. Discovery, mid-flight, ramp-down"
          />
        </div>
        <div>
          <label className="label">Where it sits in the org</label>
          <input
            value={orgPosition}
            onChange={(e) => setOrgPosition(e.target.value)}
            className="input"
            placeholder="e.g. owned by Ops, sponsored by CFO"
          />
        </div>
      </div>
      <div className="flex items-center justify-end">
        <button onClick={save} disabled={busy} className="btn-primary text-xs">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}{" "}
          Save snapshot
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 text-sm text-slate-200">
        {value || <span className="text-slate-500">Not captured.</span>}
      </div>
    </div>
  );
}
