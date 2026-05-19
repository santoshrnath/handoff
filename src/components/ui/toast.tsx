"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (opts: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((cur) => [...cur, { ...t, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    toast: push,
    success: (title, description) => push({ title, description, variant: "success" }),
    error: (title, description) => push({ title, description, variant: "error" }),
    info: (title, description) => push({ title, description, variant: "info" }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 md:bottom-6 md:right-6 md:px-0">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.variant === "error" ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const Icon =
    toast.variant === "success"
      ? CheckCircle2
      : toast.variant === "error"
        ? AlertCircle
        : Info;

  const tone =
    toast.variant === "success"
      ? "border-emerald-glow/30 bg-emerald-glow/10 text-emerald-100"
      : toast.variant === "error"
        ? "border-rose-glow/30 bg-rose-glow/10 text-rose-100"
        : "border-violet-glow/30 bg-violet-glow/10 text-violet-100";

  const iconTone =
    toast.variant === "success"
      ? "text-emerald-300"
      : toast.variant === "error"
        ? "text-rose-300"
        : "text-violet-300";

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-ink-900/95 p-3 shadow-card-lift backdrop-blur-xl animate-in",
        tone,
      )}
      style={{
        animation: "toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", iconTone)} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-tight text-white">
          {toast.title}
        </div>
        {toast.description && (
          <div className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
            {toast.description}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="rounded-md p-1 text-slate-500 hover:bg-white/[0.06] hover:text-white"
        aria-label="dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
