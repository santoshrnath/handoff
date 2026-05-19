"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, FileText, Sparkles } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type A = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  summary: string | null;
  uploadedAt: string | Date;
};

export function ArtifactsTab({
  contextId,
  artifacts,
  isOwner,
}: {
  contextId: string;
  artifacts: A[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    let okCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`${file.name} (${i + 1}/${files.length})`);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/contexts/${contextId}/artifacts`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(`Upload failed: ${file.name}`, j.error ?? res.statusText);
      } else {
        okCount++;
      }
    }
    setProgress(null);
    setBusy(false);
    if (okCount > 0) {
      toast.success(
        `${okCount} file${okCount === 1 ? "" : "s"} uploaded`,
        "AI is extracting structure.",
      );
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-base font-semibold">Add artifacts to build context</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Upload files. AI will analyze and propose context updates you can
          accept or edit.
        </p>

        {isOwner && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              upload(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`mt-4 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
              drag
                ? "border-violet-glow/50 bg-violet-glow/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => upload(e.target.files)}
              accept=".pdf,.docx,.txt,.md,.csv"
            />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-400/10">
              <UploadCloud className="h-6 w-6 text-violet-200" />
            </div>
            <div className="mt-3 text-sm font-semibold text-white">
              {busy ? "Uploading…" : "Drop files here or click to upload"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              PDF, DOCX, TXT, MD, CSV up to 25MB
            </div>
            {progress && (
              <div className="mt-2 text-xs text-violet-200">
                <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                {progress}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-white">Uploaded artifacts</h3>
        {artifacts.length === 0 ? (
          <div className="mt-3 text-xs text-slate-500">
            Nothing uploaded yet.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {artifacts.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-violet-glow/15">
                  <FileText className="h-4 w-4 text-violet-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-medium text-white">
                      {a.originalName}
                    </div>
                    <span className="pill text-[10px]">
                      {(a.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    Uploaded {timeAgo(a.uploadedAt)}
                  </div>
                  {a.summary && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-violet-glow/20 bg-violet-glow/5 p-2 text-xs">
                      <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0 text-violet-300" />
                      <div className="text-slate-300">{a.summary}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
