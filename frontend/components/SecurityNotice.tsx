"use client";

import { useState } from "react";
import { ShieldAlert, X } from "lucide-react";

export default function SecurityNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      style={{
        background: "rgba(184,137,26,0.08)",
        border: "1px solid rgba(184,137,26,0.28)",
        borderRadius: 14,
      }}
      className="flex items-start gap-3 px-5 py-4 mb-6"
    >
      <ShieldAlert
        size={16}
        style={{ color: "#B8891A", flexShrink: 0, marginTop: 2 }}
      />
      <div className="flex-1 min-w-0">
        <p
          style={{ color: "#B8891A", fontWeight: 800, fontSize: 13, marginBottom: 3 }}
        >
          Unaudited Contracts — Use at Your Own Risk
        </p>
        <p style={{ color: "var(--foreground-muted)", fontSize: 12, lineHeight: 1.6 }}>
          ForgeX smart contracts are deployed on Base Mainnet and have not undergone a
          formal third-party security audit. Only deposit funds you can afford to lose.
          The protocol is provided as-is for research and hackathon demonstration purposes.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ color: "var(--foreground-dim)", flexShrink: 0 }}
        className="hover:opacity-70 transition-opacity"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
