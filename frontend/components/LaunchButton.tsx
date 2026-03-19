"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { Zap } from "lucide-react";

export default function LaunchButton() {
  const { isConnected } = useAccount();
  const { open } = useAppKit();

  return (
    <div className="hidden sm:flex items-center gap-2.5">
      {/* Connection status dot */}
      <span className="relative flex items-center justify-center w-3 h-3">
        <span
          style={{
            background: isConnected ? "#22c55e" : "#ef4444",
            opacity: 0.6,
          }}
          className={`absolute w-3 h-3 rounded-full ${
            isConnected
              ? "animate-[ping_1.4s_ease-in-out_infinite]"
              : "animate-[ping_2s_ease-in-out_infinite]"
          }`}
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
          onClick={() => open()}
          className="btn btn-outline text-xs px-4 py-2 flex items-center gap-1.5"
        >
          <Zap size={12} /> Launch App
        </button>
      )}
    </div>
  );
}
