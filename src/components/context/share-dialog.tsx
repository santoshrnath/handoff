"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, ShieldCheck, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type H = { id: string; topic: string; sensitivity: string };

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
  const [toEmail, setToEmail] = useState("");
  const [type, setType] = useState<
    "LEAVE" | "ROTATION" | "DELEGATION" | "ATTRITION" | "STAND_IN" | "ONBOARDING"
  >("ROTATION");
  const [packageNote, setNote] = useState("");
  const [included, setIncluded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    const n = new Set(included);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setIncluded(n);
  }

  async function createAndTransfer() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/handoffs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contextId,
          type,
          toEmail: toEmail || undefined,
          packageNote: packageNote || undefined,
          includedHonestNoteIds: Array.from(included),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to create handoff");
      }
      const { handoff } = await res.json();
      const t = await fetch(`/api/handoffs/${handoff.id}/transfer`, {
        method: "POST",
      });
      if (!t.ok) {
        const j = await t.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to transfer");
      }
      router.push(`/handoffs/${handoff.id}`);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 p-4 backdrop-blur-sm md:items-center">
      <div className="card relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 scrollbar-thin">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-semibold">Share handoff</h2>
        <p className="mt-1 text-xs text-slate-400">
          Confirm receiver and choose what to include. Honest notes are
          private by default — they only transfer if you tick them below.
        </p>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="label">Receiver email</label>
              <input
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                type="email"
                placeholder="alex@company.com"
                className="input"
              />
              <div className="mt-1 text-[10px] text-slate-500">
                They sign in with this email to claim the handoff.
              </div>
            </div>
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
          </div>

          <div>
            <label className="label">Note for the receiver (optional)</label>
            <textarea
              value={packageNote}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Anything you want to say with the package"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-rose-300" />
              <label className="label !mb-0">Honest notes to include</label>
            </div>
            <div className="mt-2 space-y-2">
              {honestNotes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-slate-500">
                  No honest notes on this context. Nothing private will be
                  transferred.
                </div>
              ) : (
                honestNotes.map((n) => (
                  <label
                    key={n.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                      included.has(n.id)
                        ? "border-violet-glow/40 bg-violet-glow/[0.08]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={included.has(n.id)}
                      onChange={() => toggle(n.id)}
                      className="mt-0.5 h-4 w-4 accent-violet-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-white">
                        {n.topic}
                      </div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-rose-200">
                        {n.sensitivity}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-glow/20 bg-emerald-glow/[0.05] p-3 text-xs text-emerald-100">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4" />
              Trust layer
            </div>
            <ul className="mt-2 list-disc pl-4 leading-relaxed text-emerald-200/80">
              <li>Honest notes only transfer if explicitly ticked above.</li>
              <li>No retroactive access — once redacted out, gone.</li>
              <li>Receiver sees the package after you confirm transfer.</li>
            </ul>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-glow/30 bg-rose-glow/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
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
              Confirm transfer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
