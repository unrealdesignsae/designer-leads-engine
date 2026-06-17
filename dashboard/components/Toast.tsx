"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastCtx {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ctx = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3500);
    return () => clearTimeout(timer);
  }, [toasts]);

  const colors: Record<Toast["type"], string> = {
    success: "var(--color-green)",
    error: "var(--color-crimson)",
    info: "var(--color-blue)",
  };

  return (
    <ctx.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto px-4 py-2.5 rounded-md text-sm font-medium
                         border bg-surface shadow-lg backdrop-blur-md
                         flex items-center gap-2 min-w-[200px] max-w-[380px]"
              style={{ borderColor: colors[t.type] + "40" }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors[t.type] }}
              />
              <span className="text-text-primary">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ctx.Provider>
  );
}