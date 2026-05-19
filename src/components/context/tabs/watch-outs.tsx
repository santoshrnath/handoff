"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { DeleteBtn } from "./stakeholders";
import { cn } from "@/lib/utils";

type W = {
  id: string;
  topic: string;
  detail: string | null;
  severity: string;
  triedBefore: string | null;
};

const SEV_PILL: Record<string, string> = {
  LOW: "pill",
  MEDIUM: "pill-amber",
  HIGH: "pill-rose",
  CRITICAL: "pill-rose",
};

export function WatchOutsTab({
  contextId,
  watchOuts,
  isOwner,
}: {
  contextId: string;
  watchOuts: W[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Watch-outs</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            What&apos;s broken, dangerous, or tried-and-failed.
          </p>
        </div>
        {isOwner && (
          <button onClick={() => setAdding(true)} className="btn-ghost text-xs">
            <Plus className="h-3.5 w-3.5" /> Add watch-out
          </button>
        )}
      </div>

      {adding && (
        <NewWatchOut
          contextId={contextId}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="mt-4 space-y-2">
        {watchOuts.length === 0 && !adding ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <AlertTriangle className="mx-auto h-5 w-5 text-amber-300" />
            <div className="mt-2 text-sm font-medium text-white">
              No watch-outs captured
            </div>
            <div className="mt-1 text-xs text-slate-500">
              What would you wish someone had told you?
            </div>
          </div>
        ) : (
          watchOuts.map((w) => (
            <div
              key={w.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("pill text-[10px]", SEV_PILL[w.severity])}>
                      {w.severity}
                    </span>
                    <div className="text-sm font-medium text-white">{w.topic}</div>
                  </div>
                  {w.detail && (
                    <div className="mt-1 text-xs text-slate-400">{w.detail}</div>
                  )}
                  {w.triedBefore && (
                    <div className="mt-1 text-xs text-slate-500">
                      <span className="text-slate-600">Tried before: </span>
                      {w.triedBefore}
                    </div>
                  )}
                </div>
                {isOwner && (
                  <DeleteBtn
                    url={`/api/contexts/${contextId}/watch-outs/${w.id}`}
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

function NewWatchOut({
  contextId,
  onDone,
  onCancel,
}: {
  contextId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [detail, setDetail] = useState("");
  const [triedBefore, setTried] = useState("");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">(
    "MEDIUM",
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!topic.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/contexts/${contextId}/watch-outs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          detail: detail || undefined,
          triedBefore: triedBefore || undefined,
          severity,
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
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Watch-out (one line)"
        className="input"
      />
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={2}
        placeholder="Detail"
        className="input resize-none"
      />
      <textarea
        value={triedBefore}
        onChange={(e) => setTried(e.target.value)}
        rows={2}
        placeholder="What's been tried before, and why it didn't work"
        className="input resize-none"
      />
      <select
        value={severity}
        onChange={(e) => setSeverity(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")}
        className="input"
      >
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost text-xs">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={busy || !topic.trim()}
          className="btn-primary text-xs"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>
    </div>
  );
}
