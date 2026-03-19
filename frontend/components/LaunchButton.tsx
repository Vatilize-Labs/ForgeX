"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Zap } from "lucide-react";

function openWalletModal() {
  // Trigger the AppKit modal by clicking the existing appkit-button web component
  const btn = document.querySelector("appkit-button");
  if (btn) (btn as HTMLElement).click();
}

export default function LaunchButton() {
  const { isConnected } = useAccount();

  return (
    <div className="hidden sm:flex items-center gap-2.5">
      {/* Connection status dot */}
      <span className="relative flex items-center justify-center w-3 h-3">
        <span
          style={{
            background: isConnected ? "#22c55e" : "#ef4444",
            boxShadow: isConnected
              ? "0 0 0 0 rgba(34,197,94,0.4)"
              : "0 0 0 0 rgba(239,68,68,0.4)",
          }}
          className={`absolute w-3 h-3 rounded-full ${
            isConnected ? "animate-[ping_1.4s_ease-in-out_infinite]" : "animate-[ping_2s_ease-in-out_infinite]"
          } opacity-60`}
        />
        <span
          style={{ background: isConnected ? "#22c55e" : "#ef4444" }}
          className="relative w-2 h-2 rounded-full"
        />
      </span>

      {/* Launch App button */}
      {isConnected ? (
        <Link
          href="/dashboard"
          className="btn btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <Zap size={12} /> Launch App
        </Link>
      ) : (
        <button
          onClick={openWalletModal}
          className="btn btn-outline text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <Zap size={12} /> Launch App
        </button>
      )}
    </div>
  );
}
