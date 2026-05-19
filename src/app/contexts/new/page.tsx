"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, Workflow, GitBranch, User, FileBox } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = [
  {
    id: "PROJECT",
    label: "Project",
    icon: Workflow,
    body: "A bounded body of work with a start and end.",
  },
  {
    id: "CLIENT",
    label: "Client",
    icon: Building2,
    body: "A client relationship that lives across projects.",
  },
  {
    id: "WORKSTREAM",
    label: "Workstream",
    icon: GitBranch,
    body: "An ongoing line of work that doesn't have a clean end.",
  },
  {
    id: "PROCESS",
    label: "Process",
    icon: Briefcase,
    body: "A recurring process you own — how the work gets done.",
  },
  {
    id: "STAKEHOLDER",
    label: "Stakeholder",
    icon: User,
    body: "A single relationship — how this person actually operates.",
  },
  {
    id: "ACCOUNT",
    label: "Account",
    icon: FileBox,
    body: "A vendor or partner account.",
  },
] as const;

export default function NewContextPage() {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("PROJECT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [importance, setImportance] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">(
    "MEDIUM",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contexts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          importance,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to create context");
      }
      const { context } = await res.json();
      router.push(`/contexts/${context.id}`);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="h-cinematic">New context</h1>
        <p className="mt-1 text-sm text-slate-400">
          What are you handing off? You can start broad and refine — the AI
          interview will fill in the rest.
        </p>
      </div>

      <section className="card">
        <div className="label">Type</div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = t.id === type;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  active
                    ? "border-violet-glow/40 bg-violet-glow/10 ring-1 ring-violet-glow/30"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-violet-200" : "text-slate-400",
                  )}
                />
                <div className="mt-2 text-sm font-semibold text-white">
                  {t.label}
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-slate-400">
                  {t.body}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card space-y-4">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "CLIENT"
                ? "Acme Corp — strategic account"
                : type === "STAKEHOLDER"
                  ? "Poorva — VP of Marketing"
                  : type === "PROCESS"
                    ? "Monthly board pack"
                    : "Acme Corp onboarding"
            }
            className="input"
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor="description">
            What is it, in one or two sentences?
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Don't worry about details yet. The interview will probe."
            rows={3}
            className="input resize-none"
          />
        </div>
        <div>
          <div className="label">Importance</div>
          <div className="flex flex-wrap gap-2">
            {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((i) => (
              <button
                type="button"
                key={i}
                onClick={() => setImportance(i)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
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
      </section>

      {error && (
        <div className="rounded-xl border border-rose-glow/30 bg-rose-glow/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button type="submit" disabled={busy || !title.trim()} className="btn-primary">
          {busy ? "Creating…" : "Create context"}
        </button>
      </div>
    </form>
  );
}
