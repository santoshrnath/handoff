"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Archive, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";

type ContextType =
  | "PROJECT"
  | "CLIENT"
  | "WORKSTREAM"
  | "PROCESS"
  | "STAKEHOLDER"
  | "ACCOUNT";

type Importance = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type Status = "DRAFT" | "ACTIVE" | "STANDING" | "ARCHIVED";

const TYPES: ContextType[] = [
  "PROJECT",
  "CLIENT",
  "WORKSTREAM",
  "PROCESS",
  "STAKEHOLDER",
  "ACCOUNT",
];

const IMPORTANCES: Importance[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES: Status[] = ["DRAFT", "ACTIVE", "STANDING", "ARCHIVED"];

export function SnapshotTab({
  context,
  isOwner,
}: {
  context: {
    id: string;
    title: string;
    type: string;
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
  const confirm = useConfirm();
  const toast = useToast();
  const [title, setTitle] = useState(context.title);
  const [type, setType] = useState<ContextType>(context.type as ContextType);
  const [description, setDescription] = useState(context.description ?? "");
  const [currentPhase, setCurrentPhase] = useState(context.currentPhase ?? "");
  const [orgPosition, setOrgPosition] = useState(context.orgPosition ?? "");
  const [importance, setImportance] = useState<Importance>(
    context.importance as Importance,
  );
  const [status, setStatus] = useState<Status>(context.status as Status);
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  async function save() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/contexts/${context.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          description: description || null,
          currentPhase: currentPhase || null,
          orgPosition: orgPosition || null,
          importance,
          status,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed");
      }
      toast.success("Snapshot saved");
      router.refresh();
    } catch (err) {
      toast.error(
        "Couldn't save",
        String(err instanceof Error ? err.message : err),
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteContext() {
    const ok = await confirm({
      title: `Delete "${context.title}"?`,
      description:
        "This permanently removes the context and everything attached — stakeholders, decisions, open loops, watch-outs, honest notes, artifacts, handoffs, and interview transcripts.",
      confirmLabel: "Delete context",
      tone: "danger",
    });
    if (!ok) return;
    setDelBusy(true);
    try {
      const res = await fetch(`/api/contexts/${context.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Delete failed");
      }
      toast.success("Context deleted");
      router.push("/contexts");
    } catch (err) {
      toast.error(
        "Couldn't delete",
        String(err instanceof Error ? err.message : err),
      );
      setDelBusy(false);
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
    <div className="space-y-4">
      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="What is this context called?"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="label">Type</div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ContextType)}
              className="input"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="input"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">Importance</div>
            <div className="flex flex-wrap gap-1.5">
              {IMPORTANCES.map((i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setImportance(i)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-medium",
                    importance === i
                      ? "border-violet-glow/40 bg-violet-glow/10 text-violet-100"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20",
                  )}
                >
                  {i.charAt(0) + i.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

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

      <div className="card border-rose-glow/20 bg-rose-glow/[0.02]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-rose-300" />
              <h3 className="text-sm font-semibold text-white">Danger zone</h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Archive keeps the context but hides it from the active list.
              Delete is permanent and cascades to everything attached.
            </p>
          </div>
          <div className="flex gap-2">
            {status !== "ARCHIVED" && (
              <button
                onClick={async () => {
                  setStatus("ARCHIVED");
                  setBusy(true);
                  try {
                    await fetch(`/api/contexts/${context.id}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ status: "ARCHIVED" }),
                    });
                    toast.info("Archived");
                    router.refresh();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="btn-ghost text-xs"
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
            )}
            <button
              onClick={deleteContext}
              disabled={delBusy}
              className="btn-danger text-xs"
            >
              {delBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete context
            </button>
          </div>
        </div>
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
