'use client'

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useUserVaults, useIsRegistered } from "@/hooks/useVaultFactory";
import { useVaultData } from "@/hooks/useUserVault";
import Image from "next/image";
import Link from "next/link";
import { formatEther } from "viem";
import { ArrowLeft, Briefcase, DollarSign, TrendingUp, Layers, Zap } from "lucide-react";
import type { Variants } from "framer-motion";

/* ─── animation variants ─────────────────────────────────────────────────── */
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

/* ─── helpers ────────────────────────────────────────────────────────────── */
function toNum(val: bigint | undefined) {
  return val ? Number(formatEther(val)) : 0;
}
function fmtUSD(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNum(n: number, dec = 4) {
  return n.toLocaleString(undefined, { maximumFractionDigits: dec });
}
function pct(n: number) {
  return `${n.toFixed(2)}%`;
}
function truncAddr(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

/* ─── per-vault row (must be a component so hooks can be called per vault) ── */
interface VaultRowProps {
  address: `0x${string}`;
  index:   number;
}

function VaultPortfolioRow({ address, index }: VaultRowProps) {
  const v = useVaultData(address);

  const assets   = toNum(v.totalAssets);
  const accrued  = toNum(v.totalAssetsAccrued);
  const usd      = toNum(v.totalValueUSD);
  const aave     = toNum(v.aaveBalance);
  const compound = toNum(v.compoundBalance);
  const idle     = Math.max(0, assets - aave - compound);

  const yieldPct = assets > 0 ? ((accrued - assets) / assets) * 100 : 0;
  const aavePct  = assets > 0 ? (aave     / assets) * 100 : 0;
  const cmpPct   = assets > 0 ? (compound / assets) * 100 : 0;
  const idlePct  = Math.max(0, 100 - aavePct - cmpPct);

  const yieldPositive = yieldPct >= 0;

  return (
    <motion.tr
      variants={item}
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {/* Vault */}
      <td className="py-4 pr-4">
        <div className="flex items-center gap-3">
          <div
            style={{
              background: "var(--primary-muted)",
              borderRadius: 8,
              color: "var(--primary)",
              fontWeight: 900,
              fontSize: 12,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            V{index + 1}
          </div>
          <div>
            <p style={{ color: "var(--foreground)", fontWeight: 700, fontSize: 14 }}>
              Vault {index + 1}
            </p>
            <p style={{ color: "var(--foreground-dim)", fontSize: 11, fontFamily: "monospace" }}>
              {truncAddr(address)}
            </p>
          </div>
        </div>
      </td>

      {/* USD Value */}
      <td className="py-4 pr-4">
        <p style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 15 }}>{fmtUSD(usd)}</p>
        <p style={{ color: "var(--foreground-dim)", fontSize: 11 }}>{fmtNum(assets)} assets</p>
      </td>

      {/* Yield */}
      <td className="py-4 pr-4">
        <p
          style={{
            color: yieldPositive ? "#22c55e" : "#ef4444",
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          {yieldPositive ? "+" : ""}
          {pct(yieldPct)}
        </p>
      </td>

      {/* Allocation bar */}
      <td className="py-4 pr-4" style={{ minWidth: 180 }}>
        <div
          className="w-full rounded-full overflow-hidden flex"
          style={{ height: 8, background: "var(--border)" }}
        >
          {aavePct > 0 && (
            <div style={{ width: `${aavePct}%`, background: "#a855f7" }} className="h-full" />
          )}
          {cmpPct > 0 && (
            <div style={{ width: `${cmpPct}%`, background: "#22c55e" }} className="h-full" />
          )}
          {idlePct > 0 && (
            <div style={{ width: `${idlePct}%`, background: "var(--border-strong)" }} className="h-full" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span style={{ color: "#a855f7", fontSize: 10, fontWeight: 700 }}>
            Aave {aavePct.toFixed(0)}%
          </span>
          <span style={{ color: "#22c55e", fontSize: 10, fontWeight: 700 }}>
            Comp {cmpPct.toFixed(0)}%
          </span>
          <span style={{ color: "var(--foreground-dim)", fontSize: 10, fontWeight: 700 }}>
            Idle {idlePct.toFixed(0)}%
          </span>
        </div>
      </td>

      {/* Paused badge */}
      <td className="py-4">
        {v.isPaused ? (
          <span
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{
              background: "rgba(239,68,68,0.12)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            PAUSED
          </span>
        ) : (
          <span
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{
              background: "rgba(34,197,94,0.1)",
              color: "#22c55e",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            ACTIVE
          </span>
        )}
      </td>
    </motion.tr>
  );
}

/* ─── aggregator component (renders children + accumulates) ─────────────── */
/*
 * Because we can't conditionally call hooks and can't aggregate across
 * dynamic hook calls at the page level without a child component per vault,
 * we use a two-pass approach: VaultPortfolioRow renders each row, and a
 * separate hook-calling component feeds data upward via a render-prop / the
 * same VaultData hook is called again at the summary level inside
 * PortfolioSummary using a flat list of per-vault sub-components.
 *
 * To avoid calling the same RPC reads twice we create a thin collector
 * component that calls useVaultData and exposes the numbers via a callback.
 */
interface CollectorProps {
  address: `0x${string}`;
  onData: (data: {
    usd:      number;
    assets:   number;
    accrued:  number;
    aave:     number;
    compound: number;
    idle:     number;
  }) => void;
}

function VaultDataCollector({ address, onData }: CollectorProps) {
  const v = useVaultData(address);

  const assets   = toNum(v.totalAssets);
  const accrued  = toNum(v.totalAssetsAccrued);
  const usd      = toNum(v.totalValueUSD);
  const aave     = toNum(v.aaveBalance);
  const compound = toNum(v.compoundBalance);
  const idle     = Math.max(0, assets - aave - compound);

  // Call onData synchronously during render — this is intentional for
  // accumulation across sibling collectors within the same render pass.
  onData({ usd, assets, accrued, aave, compound, idle });

  return null;
}

/* ─── summary card ──────────────────────────────────────────────────────── */
interface SummaryProps {
  vaults: readonly string[];
}

function PortfolioSummary({ vaults }: SummaryProps) {
  /* We accumulate per-vault data via collector children rendered during this
     component's own render. The accumulators are plain objects mutated during
     render — this is safe because React re-renders are deterministic. */
  const acc = { usd: 0, assets: 0, accrued: 0, aave: 0, compound: 0, idle: 0 };

  const collectors = vaults.map((addr) => (
    <VaultDataCollector
      key={addr}
      address={addr as `0x${string}`}
      onData={(d) => {
        acc.usd      += d.usd;
        acc.assets   += d.assets;
        acc.accrued  += d.accrued;
        acc.aave     += d.aave;
        acc.compound += d.compound;
        acc.idle     += d.idle;
      }}
    />
  ));

  const totalAssets = acc.assets;
  const aavePct     = totalAssets > 0 ? (acc.aave     / totalAssets) * 100 : 0;
  const cmpPct      = totalAssets > 0 ? (acc.compound / totalAssets) * 100 : 0;
  const idlePct     = Math.max(0, 100 - aavePct - cmpPct);
  const combinedYield =
    acc.assets > 0 ? ((acc.accrued - acc.assets) / acc.assets) * 100 : 0;
  const yieldPositive = combinedYield >= 0;

  return (
    <>
      {/* collectors — render but produce no DOM */}
      {collectors}

      {/* Summary card */}
      <motion.div
        variants={item}
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        className="rounded-2xl p-7 space-y-6"
      >
        {/* Top row of stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Portfolio Value", value: fmtUSD(acc.usd),      icon: DollarSign, color: "var(--primary)" },
            { label: "Total Assets",          value: fmtNum(acc.assets),   icon: Layers,     color: "var(--foreground)" },
            { label: "Deployed to Aave",      value: fmtNum(acc.aave),     icon: Zap,        color: "#a855f7" },
            { label: "Deployed to Compound",  value: fmtNum(acc.compound), icon: Zap,        color: "#22c55e" },
            { label: "Idle",                  value: fmtNum(acc.idle),     icon: Layers,     color: "var(--foreground-dim)" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12 }}
              className="p-4"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={12} style={{ color }} />
                <span className="label" style={{ fontSize: 10 }}>{label}</span>
              </div>
              <p style={{ color, fontWeight: 800, fontSize: 17 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Combined yield */}
        <div className="flex items-center gap-3">
          <TrendingUp size={15} style={{ color: yieldPositive ? "#22c55e" : "#ef4444" }} />
          <span style={{ color: "var(--foreground-muted)", fontSize: 13, fontWeight: 600 }}>
            Combined yield across all vaults:
          </span>
          <span
            style={{
              color: yieldPositive ? "#22c55e" : "#ef4444",
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: "-0.02em",
            }}
          >
            {yieldPositive ? "+" : ""}
            {pct(combinedYield)}
          </span>
        </div>

        {/* Portfolio-wide allocation bar */}
        <div>
          <p className="label mb-2" style={{ fontSize: 10 }}>Portfolio Allocation</p>
          <div
            className="w-full rounded-full overflow-hidden flex"
            style={{ height: 12, background: "var(--border)" }}
          >
            {aavePct > 0 && (
              <div
                style={{ width: `${aavePct}%`, background: "#a855f7" }}
                className="h-full transition-all duration-700"
              />
            )}
            {cmpPct > 0 && (
              <div
                style={{ width: `${cmpPct}%`, background: "#22c55e" }}
                className="h-full transition-all duration-700"
              />
            )}
            {idlePct > 0 && (
              <div
                style={{ width: `${idlePct}%`, background: "var(--border-strong)" }}
                className="h-full transition-all duration-700"
              />
            )}
          </div>
          <div className="flex items-center gap-5 mt-2.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#a855f7" }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#a855f7" }} />
              Aave&nbsp;{aavePct.toFixed(1)}%
              <span style={{ color: "var(--foreground-dim)", fontWeight: 400 }}>
                ({fmtNum(acc.aave)})
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#22c55e" }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
              Compound&nbsp;{cmpPct.toFixed(1)}%
              <span style={{ color: "var(--foreground-dim)", fontWeight: 400 }}>
                ({fmtNum(acc.compound)})
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--foreground-dim)" }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--border-strong)" }} />
              Idle&nbsp;{idlePct.toFixed(1)}%
              <span style={{ color: "var(--foreground-dim)", fontWeight: 400 }}>
                ({fmtNum(acc.idle)})
              </span>
            </span>
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ─── page ───────────────────────────────────────────────────────────────── */
export default function PortfolioPage() {
  const { isConnected } = useAccount();
  const { data: isRegistered } = useIsRegistered();
  const { data: userVaults }   = useUserVaults();

  /* ── not connected ── */
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
        <appkit-button />
      </div>
    );
  }

  /* ── not registered ── */
  if (!isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-6 gap-5 text-center">
        <Image src="/logo.svg" alt="ForgeX" width={48} height={48} />
        <p style={{ color: "var(--foreground-muted)" }}>
          You must be registered to view your portfolio.
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const vaultCount = userVaults?.length ?? 0;

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-5 py-8 space-y-8">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between"
        >
          <div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 mb-3 text-xs font-semibold"
              style={{ color: "var(--foreground-muted)" }}
            >
              <ArrowLeft size={12} /> Back to Dashboard
            </Link>
            <span className="label block mb-2">Aggregate View</span>
            <h1
              style={{ color: "var(--foreground)", letterSpacing: "-0.04em" }}
              className="text-5xl font-black"
            >
              Portfolio
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase size={18} style={{ color: "var(--primary)" }} />
            <span className="pill pill-primary">
              {vaultCount} vault{vaultCount !== 1 ? "s" : ""}
            </span>
          </div>
        </motion.div>

        {/* ── Empty state ── */}
        {vaultCount === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ border: "2px dashed var(--border)", borderRadius: 20 }}
            className="py-24 flex flex-col items-center gap-4 text-center"
          >
            <Briefcase size={36} style={{ color: "var(--primary)", opacity: 0.5 }} />
            <p style={{ color: "var(--foreground-muted)", fontWeight: 700 }}>
              No vaults in your portfolio yet
            </p>
            <Link href="/dashboard" className="btn btn-primary flex items-center gap-2">
              <Layers size={14} /> Create a Vault
            </Link>
          </motion.div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">

            {/* ── Aggregated summary card ── */}
            <PortfolioSummary vaults={userVaults!} />

            {/* ── Per-vault table ── */}
            <motion.div
              variants={item}
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              className="rounded-2xl overflow-hidden"
            >
              <div className="px-6 pt-5 pb-3">
                <h2
                  style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 17 }}
                >
                  Vault Breakdown
                </h2>
                <p style={{ color: "var(--foreground-dim)", fontSize: 12 }}>
                  Per-vault performance and allocation
                </p>
              </div>

              <div className="overflow-x-auto">
                <motion.table
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                  className="w-full"
                  style={{ borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Vault", "USD Value", "Yield", "Allocation", "Status"].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left"
                          style={{ color: "var(--foreground-dim)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {userVaults!.map((addr: string, i: number) => (
                      <VaultPortfolioRow
                        key={addr}
                        address={addr as `0x${string}`}
                        index={i}
                      />
                    ))}
                  </tbody>
                </motion.table>
              </div>
            </motion.div>

          </motion.div>
        )}
      </div>
    </div>
  );
}
