"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Lock, ShieldCheck, ShieldAlert } from "lucide-react";
import { DeleteBtn } from "./stakeholders";
import { cn } from "@/lib/utils";

type H = {
  id: string;
  topic: string;
  content: string;
  sensitivity: string;
};

const SENS_PILL: Record<string, string> = {
  PUBLIC: "pill",
  TEAM: "pill-cyan",
  PRIVATE: "pill-amber",
  POLITICAL: "pill-rose",
};

export function HonestNotesTab({
  contextId,
  honestNotes,
}: {
  contextId: string;
  honestNotes: H[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-rose-300" />
            <h2 className="text-base font-semibold">Honest notes</h2>
          </div>
          <p className="mt-0.5 max-w-2xl text-xs text-slate-400">
            The unwritten stuff. Stays private to you until you explicitly
            transfer it on a handoff — and even then, you choose per-receiver
            which notes to include. No retroactive access.
          </p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-ghost text-xs">
          <Plus className="h-3.5 w-3.5" /> Add honest note
        </button>
      </div>

      {adding && (
        <NewNote
          contextId={contextId}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="mt-4 space-y-2">
        {honestNotes.length === 0 && !adding ? (
          <div className="rounded-xl border border-dashed border-rose-glow/20 bg-rose-glow/5 p-8 text-center">
            <Lock className="mx-auto h-5 w-5 text-rose-300" />
            <div className="mt-2 text-sm font-medium text-white">
              No honest notes
            </div>
            <div className="mt-1 max-w-md text-xs text-slate-500 mx-auto">
              This is where the politically charged read on a stakeholder, the
              workaround for a broken process, or the tolerated vendor lives.
              Private until transfer.
            </div>
          </div>
        ) : (
          honestNotes.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-rose-glow/20 bg-rose-glow/[0.04] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("pill text-[10px]", SENS_PILL[n.sensitivity])}>
                      {n.sensitivity}
                    </span>
                    <div className="text-sm font-semibold text-white">
                      {n.topic}
                    </div>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                    {n.content}
                  </div>
                </div>
                <DeleteBtn
                  url={`/api/contexts/${contextId}/honest-notes/${n.id}`}
                  onDone={() => router.refresh()}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NewNote({
  contextId,
  onDone,
  onCancel,
}: {
  contextId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [sensitivity, setSensitivity] = useState<
    "PUBLIC" | "TEAM" | "PRIVATE" | "POLITICAL"
  >("POLITICAL");
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    risky: boolean;
    reasons: string[];
    rewritten?: string;
  } | null>(null);
  const [suggestBusy, setSuggestBusy] = useState(false);

  async function checkRisk() {
    if (!content.trim() || content.length < 20) return;
    setSuggestBusy(true);
    try {
      const res = await fetch(
        `/api/contexts/${contextId}/honest-notes/suggest-redaction`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      const j = await res.json();
      setSuggestion(j);
    } finally {
      setSuggestBusy(false);
    }
  }

  async function save() {
    if (!topic.trim() || !content.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/contexts/${contextId}/honest-notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          content: content.trim(),
          sensitivity,
        }),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-rose-glow/30 bg-rose-glow/[0.04] p-4">
      <input
        autoFocus
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Topic (e.g. 'real read on Poorva')"
        className="input"
      />
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setSuggestion(null);
        }}
        rows={6}
        placeholder="Say what you'd actually say if no one would forward this."
        className="input resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        <select
          value={sensitivity}
          onChange={(e) =>
            setSensitivity(
              e.target.value as "PUBLIC" | "TEAM" | "PRIVATE" | "POLITICAL",
            )
          }
          className="input max-w-[180px]"
        >
          <option value="PUBLIC">Public</option>
          <option value="TEAM">Team</option>
          <option value="PRIVATE">Private</option>
          <option value="POLITICAL">Political</option>
        </select>
        <button
          onClick={checkRisk}
          disabled={suggestBusy || content.length < 20}
          className="btn-ghost text-xs"
        >
          {suggestBusy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" />
          )}
          Check risk
        </button>
      </div>

      {suggestion && (
        <div
          className={cn(
            "space-y-2 rounded-xl border p-3 text-xs",
            suggestion.risky
              ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
              : "border-emerald-glow/30 bg-emerald-glow/10 text-emerald-100",
          )}
        >
          <div className="flex items-center gap-2">
            {suggestion.risky ? (
              <ShieldAlert className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            <span className="font-semibold">
              {suggestion.risky ? "Risky if leaked" : "Looks fine"}
            </span>
          </div>
          {suggestion.reasons.length > 0 && (
            <ul className="list-disc pl-4 leading-relaxed">
              {suggestion.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {suggestion.rewritten && (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-slate-200">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                Suggested rewrite
              </div>
              <div className="mt-1 whitespace-pre-wrap">{suggestion.rewritten}</div>
              <button
                onClick={() => setContent(suggestion.rewritten!)}
                className="mt-2 rounded-lg border border-white/10 px-2 py-1 text-[10px] font-medium text-white hover:bg-white/[0.06]"
              >
                Use rewrite
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost text-xs">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={busy || !topic.trim() || !content.trim()}
          className="btn-primary text-xs"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Save (stays private)
        </button>
      </div>
    </div>
  );
}
