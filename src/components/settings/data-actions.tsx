"use client";

import { useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";

export function DataActions() {
  const confirm = useConfirm();
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function exportAll() {
    setDownloading(true);
    try {
      const res = await fetch("/api/me/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contextbridge-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported", "Your full data dump downloaded.");
    } catch (err) {
      toast.error(
        "Export failed",
        String(err instanceof Error ? err.message : err),
      );
    } finally {
      setDownloading(false);
    }
  }

  async function deleteAll() {
    const ok = await confirm({
      title: "Delete everything?",
      description:
        "Wipes every context, stakeholder, decision, open loop, watch-out, honest note, artifact, handoff, interview transcript and Q&A you own. Your Clerk account stays — delete that from the account menu if you also want to drop sign-in.",
      confirmLabel: "Delete everything",
      cancelLabel: "Keep my data",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/me/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE EVERYTHING" }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("All data deleted");
      window.location.href = "/";
    } catch (err) {
      toast.error(
        "Delete failed",
        String(err instanceof Error ? err.message : err),
      );
      setDeleting(false);
    }
  }

  return (
    <section className="card">
      <h2 className="text-base font-semibold">Your data</h2>
      <p className="mt-1 text-xs text-slate-400">
        Take it with you, or wipe it. Both are honored — that&apos;s a
        commitment in the trust posture above.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="text-sm font-semibold text-white">Export</div>
          <div className="mt-1 text-xs text-slate-400">
            Full JSON of every context, handoff, transcript and honest note
            you own.
          </div>
          <button
            onClick={exportAll}
            disabled={downloading}
            className="btn-ghost mt-3 text-xs"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Download my data
          </button>
        </div>

        <div className="rounded-xl border border-rose-glow/20 bg-rose-glow/[0.04] p-4">
          <div className="text-sm font-semibold text-rose-100">
            Delete everything
          </div>
          <div className="mt-1 text-xs text-rose-200/70">
            Wipes contexts, transcripts, honest notes, handoffs, Q&amp;A —
            owned and received. Not reversible.
          </div>
          <button
            onClick={deleteAll}
            disabled={deleting}
            className="btn-danger mt-3 text-xs"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete my data
          </button>
        </div>
      </div>
    </section>
  );
}
