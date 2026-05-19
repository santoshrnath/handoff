"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, X, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

type Nudge = {
  id: string;
  kind: string;
  title: string;
  prompt: string;
  cta: string | null;
  contextId: string | null;
};

export function NudgesPanel({ nudges: initial }: { nudges: Nudge[] }) {
  const router = useRouter();
  const toast = useToast();
  const [nudges, setNudges] = useState<Nudge[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function resolve(id: string, action: "DISMISSED" | "ACTED") {
    setBusyId(id);
    try {
      await fetch(`/api/nudges/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      setNudges((cur) => cur.filter((n) => n.id !== id));
      if (action === "DISMISSED") toast.info("Nudge dismissed");
    } catch (err) {
      toast.error(
        "Couldn't update",
        String(err instanceof Error ? err.message : err),
      );
    } finally {
      setBusyId(null);
    }
  }

  if (nudges.length === 0) return null;

  return (
    <section className="card relative overflow-hidden">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="relative flex items-center gap-2">
        <Bell className="h-4 w-4 text-amber-300" />
        <h2 className="text-base font-semibold">Nudges</h2>
        <span className="pill-amber text-[10px]">{nudges.length}</span>
      </div>
      <div className="relative mt-3 space-y-2">
        {nudges.map((n) => (
          <div
            key={n.id}
            className="flex flex-col gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-white">{n.title}</div>
              <div className="mt-0.5 text-xs text-amber-200/80">{n.prompt}</div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {n.contextId && (
                <Link
                  href={`/contexts/${n.contextId}`}
                  onClick={async () => {
                    // Mark as acted on the way out — don't block navigation.
                    void resolve(n.id, "ACTED");
                  }}
                  className="btn-primary text-[11px]"
                >
                  {n.cta ?? "Open"} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
              <button
                onClick={() => resolve(n.id, "DISMISSED")}
                disabled={busyId === n.id}
                aria-label="dismiss"
                className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
              >
                {busyId === n.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
