'use client'

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Anchor, Zap, GitBranch, Info, ExternalLink } from "lucide-react";
import type { Variants } from "framer-motion";
import { VULT_HOOK_ADDRESS, BASE_POOL_MANAGER } from "@/lib/constants";

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

function CopyableAddress({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}
      className="p-5 flex flex-col gap-2"
    >
      <p style={{ color: "var(--foreground-muted)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </p>
      <div className="flex items-center justify-between gap-3">
        <span
          style={{
            color: "var(--foreground)",
            fontFamily: "monospace",
            fontSize: 13,
            fontWeight: 700,
            wordBreak: "break-all",
          }}
        >
          {address}
        </span>
        <button
          onClick={handleCopy}
          title="Copy address"
          style={{
            background: copied ? "rgba(143,168,40,0.15)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${copied ? "rgba(143,168,40,0.35)" : "var(--border)"}`,
            color: copied ? "var(--primary)" : "var(--foreground-muted)",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span style={{ fontSize: 11, fontWeight: 700 }}>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}

const hookSteps = [
  {
    num: 1,
    fn: "afterAddLiquidity()",
    title: "Idle Capital Deployment",
    desc: "When an LP adds liquidity to the Uniswap v4 pool, VultHook intercepts the callback and deposits idle assets into ForgeX yield vaults (Aave / Compound). Capital that would otherwise sit dormant in the pool immediately starts earning yield.",
    icon: GitBranch,
    color: "#a855f7",
  },
  {
    num: 2,
    fn: "beforeSwap()",
    title: "Liquidity Rebalancing",
    desc: "Before a swap is executed, VultHook checks whether the pool has sufficient liquidity to fill the order. If reserves are too low, it withdraws the required amount from the underlying vaults, ensuring swaps are never blocked by capital that was deployed to yield protocols.",
    icon: Zap,
    color: "#3b82f6",
  },
  {
    num: 3,
    fn: "afterSwap()",
    title: "Yield Harvest & Donation",
    desc: "After each swap, VultHook compares totalAssetsAccrued to totalAssets in the vault. When accrued yield exceeds the configured threshold (1 000 wei), it harvests the surplus and donates it directly back to LPs through Uniswap v4's native donate mechanism — no manual claiming required.",
    icon: Anchor,
    color: "var(--primary)",
  },
];

const specs = [
  { label: "Hook Type",          value: "Uniswap v4" },
  { label: "Network",            value: "Base Mainnet" },
  { label: "Min Yield Threshold",value: "1 000 wei" },
  { label: "Supported Assets",   value: "WETH (initially)" },
];

const flags = [
  { name: "afterAddLiquidity",    active: true },
  { name: "beforeSwap",           active: true },
  { name: "afterSwap",            active: true },
  { name: "beforeAddLiquidity",   active: false },
  { name: "beforeRemoveLiquidity",active: false },
  { name: "afterRemoveLiquidity", active: false },
  { name: "beforeInitialize",     active: false },
  { name: "afterInitialize",      active: false },
];

export default function HookPage() {
  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-4xl mx-auto px-5 py-8">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 mb-4 text-xs font-semibold"
            style={{ color: "var(--foreground-muted)" }}
          >
            <ArrowLeft size={12} /> Back to Dashboard
          </Link>
          <span className="label block mb-2">Uniswap v4 · Base Mainnet</span>
          <h1
            style={{ color: "var(--foreground)", letterSpacing: "-0.04em" }}
            className="text-5xl font-black mb-3"
          >
            VultHook
          </h1>
          <p style={{ color: "var(--foreground-muted)", maxWidth: 560, lineHeight: 1.65 }}>
            A Uniswap v4 hook that puts idle LP liquidity to work in ForgeX yield vaults, then automatically harvests and donates yield back to liquidity providers.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-8">

          {/* ── Contract Addresses ── */}
          <motion.section variants={item}>
            <h2 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 18, marginBottom: 14 }}>
              Contract Addresses
            </h2>
            <div className="flex flex-col gap-3">
              <CopyableAddress label="VultHook Address" address={VULT_HOOK_ADDRESS} />
              <CopyableAddress label="Base PoolManager" address={BASE_POOL_MANAGER} />
            </div>
          </motion.section>

          {/* ── How It Works ── */}
          <motion.section variants={item}>
            <h2 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 18, marginBottom: 14 }}>
              How VultHook Works
            </h2>
            <div className="flex flex-col gap-4">
              {hookSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.num}
                    style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}
                    className="p-5 flex gap-5"
                  >
                    {/* Number badge */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: `${step.color}18`,
                        border: `1px solid ${step.color}35`,
                        color: step.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: 16,
                        flexShrink: 0,
                      }}
                    >
                      {step.num}
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon size={13} style={{ color: step.color, flexShrink: 0 }} />
                        <code
                          style={{
                            color: step.color,
                            background: `${step.color}14`,
                            borderRadius: 6,
                            padding: "2px 8px",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {step.fn}
                        </code>
                        <span style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 14 }}>
                          {step.title}
                        </span>
                      </div>
                      <p style={{ color: "var(--foreground-muted)", fontSize: 13, lineHeight: 1.65 }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* ── Hook Specifications ── */}
          <motion.section variants={item}>
            <h2 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 18, marginBottom: 14 }}>
              Hook Specifications
            </h2>
            <div
              style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}
              className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {specs.map(({ label, value }) => (
                <div key={label}>
                  <p style={{ color: "var(--foreground-muted)", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>
                    {label}
                  </p>
                  <p style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 15 }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── Hook Flags ── */}
          <motion.section variants={item}>
            <h2 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 18, marginBottom: 14 }}>
              Hook Flags
            </h2>
            <div
              style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}
              className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {flags.map(({ name, active }) => (
                <div
                  key={name}
                  style={{
                    background: active ? "rgba(143,168,40,0.10)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? "rgba(143,168,40,0.28)" : "var(--border)"}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: active ? "var(--primary)" : "var(--foreground-muted)",
                      }}
                    >
                      {active ? "✓" : "✗"}
                    </span>
                    <span
                      style={{
                        color: active ? "var(--primary)" : "var(--foreground-muted)",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p
                    style={{
                      color: active ? "var(--foreground)" : "var(--foreground-muted)",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      wordBreak: "break-word",
                    }}
                  >
                    {name}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── Indexer Note ── */}
          <motion.section variants={item}>
            <div
              style={{
                background: "rgba(143,168,40,0.08)",
                border: "1px solid rgba(143,168,40,0.22)",
                borderRadius: 14,
                padding: "16px 20px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <Info size={16} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ color: "var(--primary)", fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                  Live Harvest Events
                </p>
                <p style={{ color: "var(--foreground-muted)", fontSize: 13, lineHeight: 1.65 }}>
                  Real-time harvest events require an on-chain indexer (e.g.{" "}
                  <a
                    href="https://thegraph.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "underline" }}
                  >
                    The Graph
                  </a>
                  ). Connect a subgraph to see live yield harvest history.
                </p>
              </div>
            </div>
          </motion.section>

        </motion.div>
      </div>
    </div>
  );
}
