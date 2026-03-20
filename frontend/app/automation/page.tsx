'use client';

import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract } from "wagmi";
import { useUserVaults, useIsRegistered } from "@/hooks/useVaultFactory";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Zap,
  ExternalLink,
  CheckCircle,
  Clock,
  Info,
  Copy,
  Check,
} from "lucide-react";
import type { Variants } from "framer-motion";

/* ── Animation variants ───────────────────────────────────────── */
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

/* ── Inline ABI ───────────────────────────────────────────────── */
const CHECK_UPKEEP_ABI = [
  {
    inputs: [{ internalType: "bytes", name: "checkData", type: "bytes" }],
    name: "checkUpkeep",
    outputs: [
      { internalType: "bool", name: "upkeepNeeded", type: "bool" },
      { internalType: "bytes", name: "performData", type: "bytes" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/* ── Helper: truncate address ─────────────────────────────────── */
function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/* ── CopyButton ───────────────────────────────────────────────── */
function CopyButton({ text, size = 14 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy address"
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: copied ? "green" : "var(--foreground-muted)",
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 4px",
        borderRadius: 6,
        transition: "color 180ms ease",
      }}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}

/* ── VaultAutomationCard ──────────────────────────────────────── */
function VaultAutomationCard({
  vaultAddress,
  index,
}: {
  vaultAddress: `0x${string}`;
  index: number;
}) {
  const [stepsOpen, setStepsOpen] = useState(false);

  const { data: upkeepResult, isLoading: upkeepLoading } = useReadContract({
    address: vaultAddress,
    abi: CHECK_UPKEEP_ABI,
    functionName: "checkUpkeep",
    args: ["0x"],
  });

  const upkeepNeeded: boolean | undefined =
    upkeepResult !== undefined ? (upkeepResult as [boolean, `0x${string}`])[0] : undefined;

  /* Status badge */
  const StatusBadge = () => {
    if (upkeepLoading) {
      return (
        <span
          className="skeleton"
          style={{
            display: "inline-block",
            width: 120,
            height: 22,
            borderRadius: 999,
          }}
        />
      );
    }
    if (upkeepNeeded === true) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            background: "rgba(184,137,26,0.12)",
            color: "amber",
            border: "1px solid rgba(184,137,26,0.28)",
          }}
        >
          <Clock size={11} style={{ color: "amber" }} />
          <span style={{ color: "#d97706" }}>Upkeep Needed</span>
        </span>
      );
    }
    if (upkeepNeeded === false) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.20)",
          }}
        >
          <CheckCircle size={11} style={{ color: "green" }} />
          <span style={{ color: "green" }}>No Action Needed</span>
        </span>
      );
    }
    return null;
  };

  return (
    <motion.div
      variants={item}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Vault badge */}
          <div
            style={{
              background: "var(--primary-muted)",
              borderRadius: 12,
              width: 42,
              height: 42,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Zap size={18} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <span className="label" style={{ display: "block", marginBottom: 2 }}>
              Vault {index + 1}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  color: "var(--foreground)",
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: "var(--font-mono, monospace)",
                  letterSpacing: "-0.01em",
                }}
              >
                {truncateAddress(vaultAddress)}
              </span>
              <CopyButton text={vaultAddress} />
            </div>
          </div>
        </div>
        <StatusBadge />
      </div>

      {/* Action row */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <a
          href="https://automation.chain.link"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ fontSize: 13, padding: "9px 18px", gap: 6 }}
        >
          <ExternalLink size={13} />
          Register with Chainlink
        </a>

        <button
          onClick={() => setStepsOpen((v) => !v)}
          className="btn btn-outline"
          style={{ fontSize: 13, padding: "9px 18px", gap: 6 }}
        >
          <Info size={13} />
          {stepsOpen ? "Hide Instructions" : "How to Register"}
        </button>
      </div>

      {/* Collapsible step-by-step instructions */}
      {stepsOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            overflow: "hidden",
            background: "var(--primary-muted)",
            border: "1px solid var(--border-strong)",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <p
            style={{
              color: "var(--primary)",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Registration Steps
          </p>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {[
              {
                step: 1,
                content: (
                  <span style={{ color: "var(--foreground)", fontSize: 13 }}>
                    Go to{" "}
                    <a
                      href="https://automation.chain.link"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--primary)",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      automation.chain.link
                    </a>{" "}
                    and connect your wallet.
                  </span>
                ),
              },
              {
                step: 2,
                content: (
                  <span style={{ color: "var(--foreground)", fontSize: 13 }}>
                    Click <strong style={{ color: "var(--foreground)" }}>"Register New Upkeep"</strong> and choose{" "}
                    <strong style={{ color: "var(--foreground)" }}>"Custom Logic"</strong>.
                  </span>
                ),
              },
              {
                step: 3,
                content: (
                  <span
                    style={{
                      color: "var(--foreground)",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    Paste your vault address:
                    <code
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "1px 7px",
                        fontSize: 12,
                        color: "var(--foreground)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {truncateAddress(vaultAddress)}
                      <CopyButton text={vaultAddress} size={12} />
                    </code>
                  </span>
                ),
              },
              {
                step: 4,
                content: (
                  <span style={{ color: "var(--foreground)", fontSize: 13 }}>
                    Set a LINK balance to fund the upkeep{" "}
                    <span style={{ color: "var(--foreground-muted)" }}>(minimum 1 LINK recommended)</span>.
                  </span>
                ),
              },
              {
                step: 5,
                content: (
                  <span style={{ color: "var(--foreground)", fontSize: 13 }}>
                    Confirm registration — automated rebalancing will begin immediately.
                  </span>
                ),
              },
            ].map(({ step, content }) => (
              <li
                key={step}
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--primary)",
                    color: "var(--background)",
                    fontSize: 11,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {step}
                </span>
                <span style={{ flex: 1 }}>{content}</span>
              </li>
            ))}
          </ol>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function AutomationPage() {
  const { isConnected } = useAccount();
  const { data: isRegistered } = useIsRegistered();
  const { data: userVaults } = useUserVaults();

  const vaults = (userVaults ?? []) as `0x${string}`[];

  /* Guard: not connected */
  if (!isConnected) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <Image src="/logo.svg" alt="ForgeX" width={48} height={48} />
        <h2
          style={{
            color: "var(--foreground)",
            letterSpacing: "-0.03em",
            fontSize: 28,
            fontWeight: 900,
            margin: 0,
          }}
        >
          Connect your wallet
        </h2>
        <p style={{ color: "var(--foreground-muted)", margin: 0 }}>
          Connect to manage Chainlink Automation for your vaults.
        </p>
        <appkit-button />
      </div>
    );
  }

  /* Guard: not registered */
  if (!isRegistered) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <Image src="/logo.svg" alt="ForgeX" width={48} height={48} />
        <h2
          style={{
            color: "var(--foreground)",
            letterSpacing: "-0.03em",
            fontSize: 28,
            fontWeight: 900,
            margin: 0,
          }}
        >
          No account found
        </h2>
        <p style={{ color: "var(--foreground-muted)", margin: 0 }}>
          You need to register and create a vault before managing automation.
        </p>
        <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 4 }}>
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: 80 }}>
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "32px 20px 64px",
        }}
      >
        {/* ── Back link ── */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 28 }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--foreground-muted)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              transition: "color 180ms ease",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color =
                "var(--foreground)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color =
                "var(--foreground-muted)")
            }
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
        </motion.div>

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04 }}
          style={{ marginBottom: 32 }}
        >
          <span className="label" style={{ display: "block", marginBottom: 8 }}>
            Chainlink Automation
          </span>
          <h1
            style={{
              color: "var(--foreground)",
              letterSpacing: "-0.04em",
              fontSize: 44,
              fontWeight: 900,
              margin: 0,
              lineHeight: 1.05,
            }}
          >
            Automation
          </h1>
        </motion.div>

        {/* ── Info banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            background: "var(--primary-muted)",
            border: "1px solid var(--border-strong)",
            borderRadius: 16,
            padding: "18px 22px",
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              background: "rgba(143,168,40,0.18)",
              borderRadius: 10,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <Zap size={16} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <p
              style={{
                color: "var(--primary)",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                marginBottom: 6,
                margin: 0,
              }}
            >
              What is Chainlink Automation?
            </p>
            <p
              style={{
                color: "var(--foreground)",
                fontSize: 13,
                lineHeight: 1.65,
                margin: "6px 0 0",
              }}
            >
              Chainlink Automation allows your ForgeX vaults to run
              autonomously. Once registered, Chainlink nodes continuously
              monitor your vault and trigger three key actions without
              any manual intervention:
            </p>
            <ul
              style={{
                color: "var(--foreground-muted)",
                fontSize: 13,
                lineHeight: 1.7,
                margin: "10px 0 0",
                paddingLeft: 18,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <li>
                <strong style={{ color: "var(--foreground)" }}>
                  Automated rebalancing
                </strong>{" "}
                — moves funds between Aave and Compound whenever the yield
                differential exceeds the configured threshold.
              </li>
              <li>
                <strong style={{ color: "var(--foreground)" }}>
                  Periodic yield harvesting
                </strong>{" "}
                — claims and compounds accrued rewards on your behalf.
              </li>
              <li>
                <strong style={{ color: "var(--foreground)" }}>
                  Vault health monitoring
                </strong>{" "}
                — checks collateral ratios and positions to keep your vault
                safe.
              </li>
            </ul>
          </div>
        </motion.div>

        {/* ── Vault cards ── */}
        {vaults.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              border: "2px dashed var(--border)",
              borderRadius: 20,
              padding: "60px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                background: "var(--primary-muted)",
                borderRadius: 14,
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Zap size={22} style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <p
                style={{
                  color: "var(--foreground-muted)",
                  fontWeight: 700,
                  marginBottom: 6,
                  margin: 0,
                }}
              >
                No vaults found
              </p>
              <p
                style={{
                  color: "var(--foreground-dim)",
                  fontSize: 13,
                  margin: "6px 0 0",
                }}
              >
                Create a vault first to configure Chainlink Automation.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="btn btn-primary"
              style={{ marginTop: 4 }}
            >
              Go to Dashboard
            </Link>
          </motion.div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}
          >
            {vaults.map((vault, index) => (
              <VaultAutomationCard
                key={vault}
                vaultAddress={vault}
                index={index}
              />
            ))}
          </motion.div>
        )}

        {/* ── Bottom info card: checkUpkeep / performUpkeep explainer ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "24px 28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div
              style={{
                background: "var(--primary-muted)",
                borderRadius: 10,
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Info size={15} style={{ color: "var(--primary)" }} />
            </div>
            <p
              style={{
                color: "var(--foreground)",
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              How the contract works
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            {/* checkUpkeep */}
            <div
              style={{
                background: "var(--primary-muted)",
                border: "1px solid var(--border-strong)",
                borderRadius: 14,
                padding: "16px 18px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  color: "var(--primary)",
                  fontWeight: 700,
                  fontSize: 13,
                  margin: "0 0 8px",
                }}
              >
                checkUpkeep()
              </p>
              <p
                style={{
                  color: "var(--foreground-muted)",
                  fontSize: 13,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                Called off-chain by Chainlink nodes on every block. Returns{" "}
                <code
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    background: "var(--card)",
                    padding: "1px 5px",
                    borderRadius: 4,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                >
                  upkeepNeeded = true
                </code>{" "}
                when the yield differential between Aave and Compound
                exceeds the vault's configured rebalancing threshold,
                signalling that a rebalance should occur.
              </p>
            </div>

            {/* performUpkeep */}
            <div
              style={{
                background: "var(--primary-muted)",
                border: "1px solid var(--border-strong)",
                borderRadius: 14,
                padding: "16px 18px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  color: "var(--primary)",
                  fontWeight: 700,
                  fontSize: 13,
                  margin: "0 0 8px",
                }}
              >
                performUpkeep()
              </p>
              <p
                style={{
                  color: "var(--foreground-muted)",
                  fontSize: 13,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                Executed on-chain by Chainlink when{" "}
                <code
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    background: "var(--card)",
                    padding: "1px 5px",
                    borderRadius: 4,
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                >
                  checkUpkeep
                </code>{" "}
                returns true. Moves funds from the lower-yield protocol
                to the higher-yield one — fully automated, trustless, and
                gasless for the vault owner.
              </p>
            </div>
          </div>

          <p
            style={{
              color: "var(--foreground-dim)",
              fontSize: 12,
              marginTop: 16,
              marginBottom: 0,
              lineHeight: 1.6,
            }}
          >
            Both functions are implemented in{" "}
            <code
              style={{
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--foreground-muted)",
                fontSize: 12,
              }}
            >
              UserVault.sol
            </code>{" "}
            and conform to the{" "}
            <a
              href="https://docs.chain.link/chainlink-automation/guides/compatible-contracts"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--primary)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              AutomationCompatibleInterface
            </a>
            . Register each vault separately on the Chainlink network using
            the steps above.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
