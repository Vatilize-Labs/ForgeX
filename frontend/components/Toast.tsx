"use client";

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from "react";
import { ExternalLink } from "lucide-react";

type ToastType = "success" | "error" | "info" | "tx";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  txHash?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, txHash?: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", txHash?: string) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type, txHash }]);
      const duration = type === "tx" ? 6000 : 4000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-5 py-3 rounded-xl text-sm font-bold shadow-lg backdrop-blur-xl border animate-[slideIn_0.3s_ease-out] ${
              toast.type === "success"
                ? "bg-green-500/20 border-green-500/30 text-green-300"
                : toast.type === "error"
                ? "bg-red-500/20 border-red-500/30 text-red-300"
                : toast.type === "tx"
                ? ""
                : "bg-white/10 border-white/20 text-white"
            }`}
            style={
              toast.type === "tx"
                ? {
                    background: "rgba(143,168,40,0.12)",
                    border: "1px solid rgba(143,168,40,0.25)",
                    color: "var(--primary)",
                  }
                : undefined
            }
          >
            <span>{toast.message}</span>
            {toast.type === "tx" && toast.txHash && (
              <a
                href={`https://basescan.org/tx/${toast.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 mt-1 text-xs font-semibold underline underline-offset-2"
                style={{ color: "var(--primary)", opacity: 0.85 }}
              >
                <ExternalLink size={11} />
                {truncateHash(toast.txHash)}
              </a>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
