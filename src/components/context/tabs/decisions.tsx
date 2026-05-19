"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Gavel } from "lucide-react";
import { DeleteBtn } from "./stakeholders";
import { timeAgo } from "@/lib/utils";

type D = {
  id: string;
  title: string;
  rationale: string | null;
  alternativesRejected: string | null;
  whoWouldPushBack: string | null;
  createdAt: string | Date;
};

export function DecisionsTab({
  contextId,
  decisions,
  isOwner,
}: {
  contextId: string;
  decisions: D[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Decisions</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            What was decided, why, what was rejected, and who would push back.
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setAdding(true)}
            className="btn-ghost text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add decision
          </button>
        )}
      </div>

      {adding && (
        <NewDecisionForm
          contextId={contextId}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="mt-4 space-y-3">
        {decisions.length === 0 && !adding ? (
          <Empty />
        ) : (
          decisions.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Gavel className="h-4 w-4 text-violet-300" />
                    <div className="text-sm font-semibold text-white">
                      {d.title}
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    Logged {timeAgo(d.createdAt)}
                  </div>
                </div>
                {isOwner && (
                  <DeleteBtn
                    url={`/api/contexts/${contextId}/decisions/${d.id}`}
                    onDone={() => router.refresh()}
                  />
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <DetailField label="Rationale" value={d.rationale} />
                <DetailField label="Rejected alternatives" value={d.alternativesRejected} />
                <DetailField label="Pushback from" value={d.whoWouldPushBack} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NewDecisionForm({
  contextId,
  onDone,
  onCancel,
}: {
  contextId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [alternativesRejected, setAlt] = useState("");
  const [whoWouldPushBack, setPushback] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/contexts/${contextId}/decisions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          rationale: rationale || undefined,
          alternativesRejected: alternativesRejected || undefined,
          whoWouldPushBack: whoWouldPushBack || undefined,
        }),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-violet-glow/30 bg-violet-glow/[0.04] p-4">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Decision (one line)"
        className="input"
      />
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        rows={2}
        placeholder="Rationale"
        className="input resize-none"
      />
      <textarea
        value={alternativesRejected}
        onChange={(e) => setAlt(e.target.value)}
        rows={2}
        placeholder="What was rejected, and why"
        className="input resize-none"
      />
      <input
        value={whoWouldPushBack}
        onChange={(e) => setPushback(e.target.value)}
        placeholder="Who would push back on this?"
        className="input"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost text-xs">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={busy || !title.trim()}
          className="btn-primary text-xs"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Save decision
        </button>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xs leading-relaxed text-slate-300">
        {value || <span className="text-slate-600">Not captured.</span>}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
      <Gavel className="mx-auto h-5 w-5 text-violet-200" />
      <div className="mt-2 text-sm font-medium text-white">
        No decisions logged
      </div>
      <div className="mt-1 text-xs text-slate-500">
        Capture choices and rationale. The interview will probe rejected
        alternatives.
      </div>
    </div>
  );
}
