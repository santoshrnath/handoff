"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Sparkles,
  Clock,
  Loader2,
  Check,
  StopCircle,
  RotateCcw,
  Mic,
  MicOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type Msg = {
  id: string;
  role: "ASSISTANT" | "USER" | "SYSTEM";
  content: string;
  phase: string;
  createdAt: string | Date;
};

type Session = {
  id: string;
  contextId: string;
  phase: string;
  status: string;
  mode: string;
  startedAt: string | Date;
  messages: Msg[];
  context: { id: string; title: string; type: string };
};

const PHASES = ["WARM_UP", "CORE", "DEEP_DIVE", "WRAP_UP"] as const;

// Minimal typing for the browser SpeechRecognition API (vendor-prefixed).
type SpeechRecognitionResultLike = { transcript: string; isFinal: boolean };
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>; resultIndex: number }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function InterviewRoom({ session: initial }: { session: Session }) {
  const router = useRouter();
  const toast = useToast();
  const [messages, setMessages] = useState<Msg[]>(initial.messages);
  const [phase, setPhase] = useState(initial.phase);
  const [status, setStatus] = useState(initial.status);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [synthBusy, setSynthBusy] = useState(false);
  const [reopenBusy, setReopenBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const i = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Detect browser speech-recognition support (Chromium-family).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    setVoiceSupported(!!Ctor);
  }, []);

  // Auto-kick the first AI turn if there are no messages yet.
  useEffect(() => {
    if (messages.length === 0 && status !== "COMPLETED") {
      void sendTurn(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendTurn(userMessage: string | undefined) {
    setBusy(true);
    if (userMessage) {
      setMessages((m) => [
        ...m,
        {
          id: `tmp-${Date.now()}`,
          role: "USER",
          content: userMessage,
          phase,
          createdAt: new Date(),
        },
      ]);
    }
    try {
      const res = await fetch(`/api/interviews/${initial.id}/turn`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userMessage }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.code === "usage_cap_reached") {
          throw new Error(j.message ?? "Daily limit reached.");
        }
        if (j.code === "rate_limited") {
          throw new Error(j.message ?? "Slow down a moment.");
        }
        throw new Error(j.error ?? "Interview turn failed");
      }
      const { assistantMessage, phase: newPhase } = await res.json();
      setMessages((m) => [...m, assistantMessage]);
      setPhase(newPhase);
    } catch (err) {
      toast.error(
        "Interview turn failed",
        String(err instanceof Error ? err.message : err),
      );
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const v = input.trim();
    if (!v || busy) return;
    stopListening();
    setInput("");
    void sendTurn(v);
  }

  async function endAndSynthesize() {
    setSynthBusy(true);
    try {
      const res = await fetch(`/api/interviews/${initial.id}/synthesize`, {
        method: "POST",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Synthesis failed");
      }
      const { created } = await res.json();
      setStatus("COMPLETED");
      const summary = [
        `${created.stakeholders} stakeholder${created.stakeholders === 1 ? "" : "s"}`,
        `${created.decisions} decision${created.decisions === 1 ? "" : "s"}`,
        `${created.openLoops} open loop${created.openLoops === 1 ? "" : "s"}`,
        `${created.watchOuts} watch-out${created.watchOuts === 1 ? "" : "s"}`,
        `${created.honestNotes} honest note${created.honestNotes === 1 ? "" : "s"}`,
      ].join(" · ");
      toast.success("Interview synthesized", `Added ${summary}.`);
      router.push(`/contexts/${initial.contextId}`);
    } catch (err) {
      toast.error(
        "Synthesis failed",
        String(err instanceof Error ? err.message : err),
      );
    } finally {
      setSynthBusy(false);
    }
  }

  async function reopen() {
    setReopenBusy(true);
    try {
      const res = await fetch(`/api/interviews/${initial.id}/reopen`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Reopen failed");
      setStatus("IN_PROGRESS");
      toast.success("Interview reopened", "Add more turns, then re-synthesize.");
    } catch (err) {
      toast.error(
        "Couldn't reopen",
        String(err instanceof Error ? err.message : err),
      );
    } finally {
      setReopenBusy(false);
    }
  }

  function startListening() {
    if (!voiceSupported || listening) return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
    let buffer = input;
    rec.onresult = (e) => {
      let interim = "";
      let appended = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i][0];
        if (e.results[i][0].isFinal || (e.results[i] as unknown as { isFinal?: boolean }).isFinal) {
          buffer = (buffer + " " + r.transcript).replace(/\s+/g, " ").trim();
          appended = true;
        } else {
          interim += r.transcript;
        }
      }
      setInput(appended ? buffer : `${buffer} ${interim}`.trim());
    };
    rec.onerror = (e) => {
      toast.error("Voice error", e.error);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stopListening() {
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        // ignore
      }
      recRef.current = null;
    }
    setListening(false);
  }

  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="card relative overflow-hidden p-0">
      <div className="border-b border-white/5 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-400">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-base font-semibold">
                {status === "COMPLETED" ? "AI Interview — completed" : "AI Interview in progress"}
              </h2>
              <span className="pill-violet text-[10px]">
                <Clock className="h-3 w-3" /> {mm}:{ss}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Context:{" "}
              <span className="text-slate-200">{initial.context.title}</span> ·{" "}
              {initial.mode === "stand_in" ? "Stand-in (5 min)" : "Full (30 min)"}
            </div>
          </div>
          {status === "COMPLETED" ? (
            <button
              onClick={reopen}
              disabled={reopenBusy}
              className="btn-ghost text-xs"
              title="Flip back to in-progress and add more answers"
            >
              {reopenBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Reopen
            </button>
          ) : (
            <button
              onClick={endAndSynthesize}
              disabled={synthBusy || messages.length < 2}
              className="btn-ghost text-xs"
            >
              {synthBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <StopCircle className="h-3.5 w-3.5" />
              )}
              End & synthesize
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {PHASES.map((p, i) => {
            const active = phase === p;
            const reached = PHASES.indexOf(phase as typeof PHASES[number]) >= i;
            return (
              <div key={p} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border text-[8px]",
                    active
                      ? "border-violet-glow/60 bg-violet-glow/20 text-violet-100"
                      : reached
                        ? "border-emerald-glow/40 bg-emerald-glow/10 text-emerald-200"
                        : "border-white/10 bg-white/[0.04] text-slate-500",
                  )}
                >
                  {reached && !active ? <Check className="h-2 w-2" /> : null}
                </div>
                <div
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-[0.12em]",
                    active
                      ? "text-violet-200"
                      : reached
                        ? "text-emerald-200"
                        : "text-slate-500",
                  )}
                >
                  {p.replace("_", "-")}
                </div>
                {i < PHASES.length - 1 && (
                  <div className="hidden flex-1 border-t border-white/5 md:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[60vh] min-h-[340px] space-y-4 overflow-y-auto p-5 scrollbar-thin"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center py-10 text-xs text-slate-500">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Starting the interview…
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} />
        ))}
        {busy && messages.length > 0 && (
          <div className="flex items-center gap-1 pt-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-violet-glow" />
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-violet-glow"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-violet-glow"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}
      </div>

      <div className="border-t border-white/5 bg-white/[0.02] p-4">
        {status === "COMPLETED" ? (
          <div className="text-center text-xs text-emerald-200">
            Interview complete. Reopen to add more turns, or start a fresh
            interview from the context page.
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              placeholder={
                listening
                  ? "Listening… speak your answer"
                  : "Type your answer. Enter to send, Shift+Enter for newline."
              }
              className={cn(
                "input flex-1 resize-none",
                listening && "ring-2 ring-rose-glow/40",
              )}
              disabled={busy}
            />
            {voiceSupported && (
              <button
                onClick={() => (listening ? stopListening() : startListening())}
                disabled={busy}
                className={cn(
                  "h-11 rounded-xl border px-3",
                  listening
                    ? "border-rose-glow/40 bg-rose-glow/15 text-rose-200"
                    : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]",
                )}
                aria-label={listening ? "Stop listening" : "Start voice input"}
                title={listening ? "Stop listening" : "Voice input"}
              >
                {listening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              onClick={submit}
              disabled={busy || !input.trim()}
              className="btn-primary h-11 px-4"
              aria-label="Send"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({
  role,
  content,
}: {
  role: "ASSISTANT" | "USER" | "SYSTEM";
  content: string;
}) {
  if (role === "USER") {
    return (
      <div className="flex items-start justify-end gap-3">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-md border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-slate-100">
          {content}
        </div>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-semibold">
          You
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-400 shadow-glow">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-violet-glow/20 bg-violet-glow/10 px-4 py-2.5 text-sm leading-relaxed text-violet-50">
        {content}
      </div>
    </div>
  );
}
