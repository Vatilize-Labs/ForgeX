'use client';

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useUserVaults, useIsRegistered } from "@/hooks/useVaultFactory";
import { useVaultData } from "@/hooks/useUserVault";
import Image from "next/image";
import Link from "next/link";
import { formatEther } from "viem";
import { ArrowLeft, GitCompare, TrendingUp, Layers, DollarSign, Activity, Zap } from "lucide-react";
import type { Variants } from "framer-motion";

/* ─── Animation variants ─────────────────────────────────────────────────── */
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmt(val: bigint | undefined, dec = 4) {
  if (!val) return "0";
  return Number(formatEther(val)).toLocaleString(undefined, { maximumFractionDigits: dec });
}

function fmtUSD(val: bigint | undefined) {
  if (!val) return "$0.00";
  return `$${Number(formatEther(val)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function yieldPct(total: bigint | undefined, accrued: bigint | undefined) {
  if (!total || !accrued || total === 0n) return "0.00";
  const base = Number(formatEther(total));
  const acc = Number(formatEther(accrued));
  if (base === 0) return "0.00";
  return (((acc - base) / base) * 100).toFixed(2);
}

function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/* ─── Metric rows definition ────────────────────────────────────────────── */
const METRIC_ROWS = [
  { key: "totalAssets",    label: "Total Assets",       icon: <Layers      size={14} /> },
  { key: "totalValueUSD",  label: "Total Value (USD)",  icon: <DollarSign  size={14} /> },
  { key: "accrued",        label: "Accrued Assets",     icon: <TrendingUp  size={14} /> },
  { key: "sharePriceUSD",  label: "Share Price (USD)",  icon: <DollarSign  size={14} /> },
  { key: "aave",           label: "Aave Deployed",      icon: <Zap         size={14} /> },
  { key: "compound",       label: "Compound Deployed",  icon: <Zap         size={14} /> },
  { key: "idle",           label: "Idle",               icon: <Activity    size={14} /> },
  { key: "yieldPct",       label: "Yield Accrued %",    icon: <TrendingUp  size={14} /> },
  { key: "status",         label: "Status",             icon: <Activity    size={14} /> },
] as const;

type MetricKey = typeof METRIC_ROWS[number]["key"];

/* ─── VaultCompareColumn ─────────────────────────────────────────────────── */
interface VaultCompareColumnProps {
  address: `0x${string}`;
  index: number;
}

function VaultCompareColumn({ address, index }: VaultCompareColumnProps) {
  const data = useVaultData(address);

  const idle =
    data.totalAssets !== undefined && data.aaveBalance !== undefined && data.compoundBalance !== undefined
      ? data.totalAssets - data.aaveBalance - data.compoundBalance
      : undefined;

  const pct = yieldPct(data.totalAssets, data.totalAssetsAccrued);
  const pctNum = parseFloat(pct);

  const values: Record<MetricKey, React.ReactNode> = {
    totalAssets:   <span>{fmt(data.totalAssets)}</span>,
    totalValueUSD: <span>{fmtUSD(data.totalValueUSD)}</span>,
    accrued:       <span>{fmt(data.totalAssetsAccrued)}</span>,
    sharePriceUSD: <span>{fmtUSD(data.sharePriceUSD)}</span>,
    aave:          <span>{fmt(data.aaveBalance)}</span>,
    compound:      <span>{fmt(data.compoundBalance)}</span>,
    idle:          <span>{fmt(idle)}</span>,
    yieldPct: (
      <span
        style={{
          color: pctNum > 0 ? "#22c55e" : pctNum < 0 ? "#ef4444" : "var(--foreground-muted)",
          fontWeight: 600,
        }}
      >
        {pctNum > 0 ? "+" : ""}
        {pct}%
      </span>
    ),
    status: data.isPaused ? (
      <span
        style={{
          background: "rgba(239,68,68,0.12)",
          color: "#ef4444",
          border: "1px solid rgba(239,68,68,0.3)",
        }}
        className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
      >
        Paused
      </span>
    ) : (
      <span
        style={{
          background: "rgba(34,197,94,0.12)",
          color: "#22c55e",
          border: "1px solid rgba(34,197,94,0.3)",
        }}
        className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
      >
        Active
      </span>
    ),
  };

  return (
    <motion.div variants={item} className="flex flex-col min-w-[150px] sm:min-w-[180px]">
      {/* Column header */}
      <div
        style={{
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
          borderTop: "1px solid var(--border)",
          borderRight: "1px solid var(--border)",
        }}
        className="flex flex-col items-center gap-1 px-4 py-4 sticky top-0 z-10"
      >
        <span
          style={{
            background: "var(--primary)",
            color: "#fff",
          }}
          className="inline-block rounded-full px-2 py-0.5 text-xs font-bold tracking-wide"
        >
          V{index + 1}
        </span>
        <span
          style={{ color: "var(--foreground-muted)", fontFamily: "monospace" }}
          className="text-xs mt-0.5"
          title={address}
        >
          {truncateAddr(address)}
        </span>
      </div>

      {/* Metric cells */}
      {METRIC_ROWS.map((row, i) => (
        <div
          key={row.key}
          style={{
            background: i % 2 === 0 ? "var(--card)" : "rgba(0,0,0,0.04)",
            borderBottom: "1px solid var(--border)",
            borderRight: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
          className="flex items-center justify-center px-4 py-3 text-sm font-medium min-h-[52px]"
        >
          {values[row.key]}
        </div>
      ))}
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function ComparePage() {
  const { isConnected } = useAccount();
  const { data: isRegistered } = useIsRegistered();
  const { data: userVaults } = useUserVaults();

  /* ── Not connected ── */
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-6 gap-5 text-center">
        <Image src="/logo.svg" alt="ForgeX" width={48} height={48} />
        <h2
          style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}
          className="text-3xl font-black"
        >
          Connect your wallet
        </h2>
        <p style={{ color: "var(--foreground-muted)" }}>
          Connect to compare your vaults side-by-side.
        </p>
        <appkit-button />
      </div>
    );
  }

  /* ── Not registered ── */
  if (isRegistered === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-6 gap-5 text-center">
        <Image src="/logo.svg" alt="ForgeX" width={48} height={48} />
        <h2
          style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}
          className="text-3xl font-black"
        >
          Register first
        </h2>
        <p style={{ color: "var(--foreground-muted)" }}>
          You need to register before you can compare vaults.
        </p>
        <Link
          href="/dashboard"
          style={{
            background: "var(--primary)",
            color: "#fff",
          }}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const vaults = (userVaults ?? []) as `0x${string}`[];
  const vaultCount = vaults.length;

  /* ── No vaults ── */
  if (vaultCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-6 gap-5 text-center">
        <div
          style={{
            border: "2px dashed var(--border-strong)",
            background: "var(--card)",
          }}
          className="rounded-2xl px-10 py-12 flex flex-col items-center gap-4 max-w-sm"
        >
          <GitCompare size={36} style={{ color: "var(--foreground-dim)" }} />
          <h2
            style={{ color: "var(--foreground)", letterSpacing: "-0.02em" }}
            className="text-xl font-bold"
          >
            No vaults yet
          </h2>
          <p style={{ color: "var(--foreground-muted)" }} className="text-sm">
            Create at least one vault from the dashboard to start comparing.
          </p>
          <Link
            href="/dashboard"
            style={{ background: "var(--primary)", color: "#fff" }}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold mt-1"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  /* ── Main comparison view ── */
  return (
    <div
      style={{ background: "var(--background)", color: "var(--foreground)" }}
      className="min-h-screen pt-20 pb-20 px-4 sm:px-8"
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="max-w-screen-xl mx-auto"
      >
        {/* ── Page header ── */}
        <motion.div variants={item} className="mb-8">
          <Link
            href="/dashboard"
            style={{ color: "var(--foreground-muted)" }}
            className="inline-flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity mb-4"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-1">
            <span
              style={{
                color: "var(--primary)",
                border: "1px solid var(--primary-muted)",
                background: "var(--primary-muted)",
                letterSpacing: "0.08em",
              }}
              className="text-[10px] font-bold uppercase rounded-full px-2.5 py-0.5 tracking-widest"
            >
              Live Comparison
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1
              style={{ letterSpacing: "-0.03em" }}
              className="text-3xl sm:text-4xl font-black"
            >
              Compare Vaults
            </h1>
            <span
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground-muted)",
              }}
              className="rounded-full px-3 py-1 text-sm font-semibold"
            >
              {vaultCount} vault{vaultCount !== 1 ? "s" : ""}
            </span>
          </div>

          <p style={{ color: "var(--foreground-muted)" }} className="mt-2 text-sm">
            All your vaults shown side-by-side with live on-chain data.
          </p>
        </motion.div>

        {/* ── Comparison grid ── */}
        <motion.div variants={item}>
          {/* Mobile scroll hint */}
          <p className="flex items-center gap-1 text-xs mb-2 md:hidden" style={{ color: "var(--foreground-dim)" }}>
            <span>←</span> Scroll horizontally to compare <span>→</span>
          </p>
          <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--border)", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            <div className="flex min-w-max">

              {/* Leftmost label column */}
              <div className="flex flex-col min-w-[140px] sm:min-w-[180px] sticky left-0 z-20" style={{ background: "var(--card)" }}>
                {/* Header cell — matches column header height */}
                <div
                  style={{
                    borderBottom: "1px solid var(--border)",
                    borderTop: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                  className="flex items-center gap-2 px-4 py-4 min-h-[72px]"
                >
                  <GitCompare size={16} style={{ color: "var(--primary)" }} />
                  <span
                    style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "0.85rem" }}
                  >
                    Metric
                  </span>
                </div>

                {/* Label rows */}
                {METRIC_ROWS.map((row, i) => (
                  <div
                    key={row.key}
                    style={{
                      background: i % 2 === 0 ? "var(--card)" : "rgba(0,0,0,0.04)",
                      borderBottom: "1px solid var(--border)",
                      borderRight: "1px solid var(--border-strong)",
                      color: "var(--foreground-muted)",
                    }}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium min-h-[52px]"
                  >
                    <span style={{ color: "var(--foreground-dim)" }}>{row.icon}</span>
                    {row.label}
                  </div>
                ))}
              </div>

              {/* Vault columns */}
              <motion.div variants={stagger} className="flex">
                {vaults.map((vaultAddr, idx) => (
                  <VaultCompareColumn key={vaultAddr} address={vaultAddr} index={idx} />
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ── Single vault nudge ── */}
        {vaultCount === 1 && (
          <motion.div variants={item} className="mt-6 flex justify-center">
            <div
              style={{
                border: "1px dashed var(--border-strong)",
                background: "var(--card)",
                color: "var(--foreground-muted)",
              }}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm"
            >
              <GitCompare size={15} />
              Create another vault from the dashboard to see a real comparison.
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
