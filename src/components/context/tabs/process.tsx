"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

export function ProcessTab({
  context,
  isOwner,
}: {
  context: {
    id: string;
    processFlow: string | null;
    workarounds: string | null;
  };
  isOwner: boolean;
}) {
  const router = useRouter();
  const [processFlow, setProcessFlow] = useState(context.processFlow ?? "");
  const [workarounds, setWorkarounds] = useState(context.workarounds ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await fetch(`/api/contexts/${context.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          processFlow: processFlow || null,
          workarounds: workarounds || null,
        }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!isOwner) {
    return (
      <div className="card space-y-4">
        <Field label="How the work actually flows" value={context.processFlow} />
        <Field label="Workarounds and unofficial paths" value={context.workarounds} />
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div>
        <label className="label">How the work actually flows</label>
        <textarea
          value={processFlow}
          onChange={(e) => setProcessFlow(e.target.value)}
          rows={6}
          className="input resize-none"
          placeholder="The real path, not the org-chart path. Where does it slow down? Who unblocks it?"
        />
      </div>
      <div>
        <label className="label">Workarounds and unofficial paths</label>
        <textarea
          value={workarounds}
          onChange={(e) => setWorkarounds(e.target.value)}
          rows={4}
          className="input resize-none"
          placeholder="What's broken, what people do instead, the WhatsApp groups that actually run things."
        />
      </div>
      <div className="flex items-center justify-end">
        <button onClick={save} disabled={busy} className="btn-primary text-xs">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="whitespace-pre-wrap rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2.5 text-sm text-slate-200">
        {value || <span className="text-slate-500">Not captured.</span>}
      </div>
    </div>
  );
}
