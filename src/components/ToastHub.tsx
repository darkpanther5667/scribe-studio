import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, Sparkles, Info, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "info" | "sparkle" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  subtitle?: string;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (title: string, subtitle?: string, type?: ToastType, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      showToast: (title, subtitle) => console.log(`[Toast] ${title}: ${subtitle || ""}`),
    };
  }
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, subtitle?: string, type: ToastType = "info", durationMs = 3400) => {
      const id = crypto.randomUUID();
      const newToast: ToastItem = { id, title, subtitle, type, durationMs };
      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep up to 5 toasts

      setTimeout(() => {
        removeToast(id);
      }, durationMs);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Toast Notification Stack (Bottom-Right) */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none select-none max-w-sm w-full"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          return (
            <div
              key={toast.id}
              className={`
                pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl
                bg-zinc-950/95 backdrop-blur-2xl border shadow-2xl
                transition-all duration-200 animate-in fade-in slide-in-from-bottom-3
                ${
                  toast.type === "sparkle"
                    ? "border-cyan-500/40 shadow-cyan-950/40 text-cyan-100"
                    : toast.type === "success"
                    ? "border-emerald-500/40 shadow-emerald-950/40 text-emerald-100"
                    : toast.type === "warning"
                    ? "border-amber-500/40 shadow-amber-950/40 text-amber-100"
                    : "border-sky-500/30 shadow-sky-950/40 text-zinc-100"
                }
              `}
            >
              {/* Toast Icon */}
              <div className="shrink-0 mt-0.5">
                {toast.type === "sparkle" && (
                  <div className="w-6 h-6 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  </div>
                )}
                {toast.type === "success" && (
                  <div className="w-6 h-6 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  </div>
                )}
                {toast.type === "warning" && (
                  <div className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                )}
                {toast.type === "info" && (
                  <div className="w-6 h-6 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
                    <Info className="w-3.5 h-3.5 text-sky-300" />
                  </div>
                )}
              </div>

              {/* Toast Content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="text-[13px] font-semibold tracking-tight text-white flex items-center gap-1.5">
                  <span>{toast.title}</span>
                </div>
                {toast.subtitle && (
                  <div className="text-[11px] text-zinc-400 mt-0.5 font-normal leading-relaxed">
                    {toast.subtitle}
                  </div>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
