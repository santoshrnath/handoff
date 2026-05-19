"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, TrendingUp } from "lucide-react";
import { DeleteBtn } from "./stakeholders";
import { cn } from "@/lib/utils";

type L = {
  id: string;
  title: string;
  detail: string | null;
  owner: string | null;
  blocker: string | null;
  state: string;
};

const STATES = ["IN_FLIGHT", "STUCK", "DEFERRED", "BLOCKED"] as const;

const STATE_PILL: Record<string, string> = {
  IN_FLIGHT: "pill-emerald",
  STUCK: "pill-amber",
  DEFERRED: "pill",
  BLOCKED: "pill-rose",
};

export function OpenLoopsTab({
  contextId,
  openLoops,
  isOwner,
}: {
  contextId: string;
  openLoops: L[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Open loops</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            What&apos;s mid-flight, what&apos;s stuck, what&apos;s deferred.
          </p>
        </div>
        {isOwner && (
          <button onClick={() => setAdding(true)} className="btn-ghost text-xs">
            <Plus className="h-3.5 w-3.5" /> Add open loop
          </button>
        )}
      </div>

      {adding && (
        <NewLoop
          contextId={contextId}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="mt-4 space-y-2">
        {openLoops.length === 0 && !adding ? (
          <Empty />
        ) : (
          openLoops.map((l) => (
            <div
              key={l.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("pill text-[10px]", STATE_PILL[l.state])}>
                      {l.state.replace("_", " ")}
                    </span>
                    <div className="text-sm font-medium text-white">{l.title}</div>
                  </div>
                  <div className="mt-1 grid grid-cols-1 gap-2 text-xs text-slate-400 md:grid-cols-3">
                    {l.detail && <div className="md:col-span-3">{l.detail}</div>}
                    {l.owner && (
                      <div>
                        <span className="text-slate-500">Owner: </span>
                        {l.owner}
                      </div>
                    )}
                    {l.blocker && (
                      <div className="md:col-span-2">
                        <span className="text-slate-500">Blocker: </span>
                        {l.blocker}
                      </div>
                    )}
                  </div>
                </div>
                {isOwner && (
                  <DeleteBtn
                    url={`/api/contexts/${contextId}/open-loops/${l.id}`}
                    onDone={() => router.refresh()}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NewLoop({
  contextId,
  onDone,
  onCancel,
}: {
  contextId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [owner, setOwner] = useState("");
  const [blocker, setBlocker] = useState("");
  const [state, setState] = useState<typeof STATES[number]>("IN_FLIGHT");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/contexts/${contextId}/open-loops`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          detail: detail || undefined,
          owner: owner || undefined,
          blocker: blocker || undefined,
          state,
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
        placeholder="What's open?"
        className="input"
      />
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={2}
        placeholder="Detail"
        className="input resize-none"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="Owner"
          className="input"
        />
        <input
          value={blocker}
          onChange={(e) => setBlocker(e.target.value)}
          placeholder="Blocker"
          className="input"
        />
        <select
          value={state}
          onChange={(e) => setState(e.target.value as typeof STATES[number])}
          className="input"
        >
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
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
          Save
        </button>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
      <TrendingUp className="mx-auto h-5 w-5 text-violet-200" />
      <div className="mt-2 text-sm font-medium text-white">No open loops</div>
      <div className="mt-1 text-xs text-slate-500">
        Nothing mid-flight — or nothing captured yet.
      </div>
    </div>
  );
}
