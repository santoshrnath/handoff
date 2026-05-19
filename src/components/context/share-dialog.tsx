"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, ShieldCheck, Lock, Plus, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type H = { id: string; topic: string; sensitivity: string };

type Receiver = {
  toEmail: string;
  toName: string;
  audienceLabel: string;
  includedHonestNoteIds: Set<string>;
};

function blank(): Receiver {
  return {
    toEmail: "",
    toName: "",
    audienceLabel: "",
    includedHonestNoteIds: new Set(),
  };
}

export function ShareDialog({
  contextId,
  honestNotes,
  onClose,
}: {
  contextId: string;
  honestNotes: H[];
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState<
    "LEAVE" | "ROTATION" | "DELEGATION" | "ATTRITION" | "STAND_IN" | "ONBOARDING"
  >("ROTATION");
  const [packageNote, setNote] = useState("");
  const [receivers, setReceivers] = useState<Receiver[]>([blank()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(idx: number, patch: Partial<Receiver>) {
    setReceivers((cur) =>
      cur.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }
  function toggleNote(idx: number, noteId: string) {
    setReceivers((cur) =>
      cur.map((r, i) => {
        if (i !== idx) return r;
        const next = new Set(r.includedHonestNoteIds);
        if (next.has(noteId)) next.delete(noteId);
        else next.add(noteId);
        return { ...r, includedHonestNoteIds: next };
      }),
    );
  }
  function addReceiver() {
    setReceivers((cur) => [...cur, blank()]);
  }
  function removeReceiver(idx: number) {
    setReceivers((cur) =>
      cur.length === 1 ? cur : cur.filter((_, i) => i !== idx),
    );
  }

  async function createAndTransfer() {
    setBusy(true);
    setError(null);
    try {
      const cleaned = receivers
        .map((r) => ({
          toEmail: r.toEmail.trim(),
          toName: r.toName.trim() || undefined,
          audienceLabel: r.audienceLabel.trim() || undefined,
          includedHonestNoteIds: Array.from(r.includedHonestNoteIds),
        }))
        .filter((r) => r.toEmail.length > 0);
      if (cleaned.length === 0) {
        throw new Error("Add at least one receiver email.");
      }
      const res = await fetch(`/api/handoffs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contextId,
          type,
          packageNote: packageNote || undefined,
          receivers: cleaned,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to create handoff");
      }
      const { handoff } = await res.json();
      const t = await fetch(`/api/handoffs/${handoff.id}/transfer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!t.ok) {
        const j = await t.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to transfer");
      }
      toast.success(
        "Handoff sent",
        `${cleaned.length} receiver${cleaned.length === 1 ? "" : "s"} notified.`,
      );
      router.push(`/handoffs/${handoff.id}`);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 p-4 backdrop-blur-sm md:items-center">
      <div className="card relative max-h-[92vh] w-full max-w-3xl overflow-y-auto p-6 scrollbar-thin">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-semibold">Share handoff</h2>
        <p className="mt-1 text-xs text-slate-400">
          Add one or more receivers. Each can get a different redaction of
          honest notes — peer manager gets the political read, junior taking
          over execution gets the sanitized version.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="label">Transition type</label>
            <select
              value={type}
              onChange={(e) =>
                setType(
                  e.target.value as
                    | "LEAVE"
                    | "ROTATION"
                    | "DELEGATION"
                    | "ATTRITION"
                    | "STAND_IN"
                    | "ONBOARDING",
                )
              }
              className="input"
            >
              <option value="ROTATION">Rotation</option>
              <option value="LEAVE">Leave</option>
              <option value="DELEGATION">Delegation</option>
              <option value="STAND_IN">Stand-in</option>
              <option value="ATTRITION">Attrition</option>
              <option value="ONBOARDING">Onboarding</option>
            </select>
          </div>
          <div>
            <label className="label">Note for receivers (optional)</label>
            <input
              value={packageNote}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A line all receivers will see"
              className="input"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-300" />
              <div className="label !mb-0">Receivers</div>
              <span className="pill text-[10px]">{receivers.length}</span>
            </div>
            <button
              onClick={addReceiver}
              className="btn-ghost text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add receiver
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {receivers.map((r, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    Receiver {idx + 1}
                  </div>
                  {receivers.length > 1 && (
                    <button
                      onClick={() => removeReceiver(idx)}
                      className="rounded-lg border border-white/5 p-1 text-slate-500 hover:border-rose-glow/30 hover:bg-rose-glow/10 hover:text-rose-300"
                      aria-label="remove receiver"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <input
                    type="email"
                    value={r.toEmail}
                    onChange={(e) => update(idx, { toEmail: e.target.value })}
                    placeholder="email@company.com"
                    className="input md:col-span-2"
                  />
                  <input
                    value={r.audienceLabel}
                    onChange={(e) => update(idx, { audienceLabel: e.target.value })}
                    placeholder="e.g. peer manager, junior PM"
                    className="input"
                  />
                </div>

                {honestNotes.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      <Lock className="h-3 w-3 text-rose-300" />
                      Honest notes for this receiver
                      <span className="text-rose-200/70">
                        ({r.includedHonestNoteIds.size}/{honestNotes.length} included)
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-1.5 md:grid-cols-2">
                      {honestNotes.map((n) => (
                        <label
                          key={n.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs",
                            r.includedHonestNoteIds.has(n.id)
                              ? "border-violet-glow/40 bg-violet-glow/[0.08]"
                              : "border-white/5 bg-white/[0.02] hover:border-white/10",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={r.includedHonestNoteIds.has(n.id)}
                            onChange={() => toggleNote(idx, n.id)}
                            className="mt-0.5 h-3.5 w-3.5 accent-violet-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-white">
                              {n.topic}
                            </div>
                            <div className="text-[9px] uppercase tracking-[0.12em] text-rose-200">
                              {n.sensitivity}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-emerald-glow/20 bg-emerald-glow/[0.05] p-3 text-xs text-emerald-100">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4" />
            Trust layer
          </div>
          <ul className="mt-2 list-disc pl-4 leading-relaxed text-emerald-200/80">
            <li>
              Each receiver only sees the honest notes you tick for them.
            </li>
            <li>
              No retroactive expansion: once you transfer, the redaction for
              that receiver is frozen.
            </li>
            <li>
              Receivers don&apos;t see each other&apos;s Q&amp;A, feedback or
              reality-check tags.
            </li>
          </ul>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-glow/30 bg-rose-glow/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-xs">
            Cancel
          </button>
          <button
            onClick={createAndTransfer}
            disabled={busy}
            className="btn-primary text-xs"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            Confirm transfer to {receivers.filter((r) => r.toEmail.trim()).length || 0} receiver
            {receivers.filter((r) => r.toEmail.trim()).length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
