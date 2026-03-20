'use client'

import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useUserVaults, useIsRegistered } from "@/hooks/useVaultFactory";
import { parseAbiItem, formatEther } from "viem";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, RefreshCw, ExternalLink } from "lucide-react";
import type { Variants } from "framer-motion";

// ─── Animation variants ───────────────────────────────────────────────────────
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item: Variants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

// ─── ERC-4626 event ABIs ──────────────────────────────────────────────────────
const DEPOSIT_EVENT = parseAbiItem(
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)"
);
const WITHDRAW_EVENT = parseAbiItem(
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)"
);

// ─── Types ────────────────────────────────────────────────────────────────────
type TxType = "Deposit" | "Withdraw";

interface TxRow {
  type: TxType;
  vaultIndex: number;
  vaultAddress: string;
  assets: bigint;
  shares: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(val: bigint, dec = 4) {
  return Number(formatEther(val)).toLocaleString(undefined, { maximumFractionDigits: dec });
}

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  const cells = [
    { cls: "",                        w: 72 },
    { cls: "",                        w: 90 },
    { cls: "",                        w: 60 },
    { cls: "hidden sm:table-cell",    w: 60 },
    { cls: "hidden md:table-cell",    w: 60 },
    { cls: "",                        w: 90 },
  ];
  return (
    <tr>
      {cells.map(({ cls, w }, i) => (
        <td key={i} className={`px-4 py-3 ${cls}`}>
          <div
            className="rounded animate-pulse"
            style={{ background: "var(--border)", height: 14, width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { isConnected } = useAccount();
  const { data: isRegistered } = useIsRegistered();
  const { data: userVaults } = useUserVaults();
  const client = usePublicClient();

  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!client || !userVaults || userVaults.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const latestBlock = await client.getBlockNumber();
      const fromBlock = latestBlock > 50000n ? latestBlock - 50000n : 0n;

      const allRows: TxRow[] = [];

      await Promise.all(
        (userVaults as `0x${string}`[]).map(async (vaultAddress, vaultIndex) => {
          const logs = await client.getLogs({
            address: vaultAddress,
            events: [DEPOSIT_EVENT, WITHDRAW_EVENT],
            fromBlock,
            toBlock: latestBlock,
          });

          for (const log of logs) {
            if (!log.transactionHash || log.blockNumber == null) continue;

            const eventName = (log as { eventName?: string }).eventName;
            const args = (log as { args?: Record<string, unknown> }).args ?? {};

            if (eventName === "Deposit") {
              allRows.push({
                type: "Deposit",
                vaultIndex,
                vaultAddress,
                assets: BigInt(String(args.assets ?? 0n)),
                shares: BigInt(String(args.shares ?? 0n)),
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
              });
            } else if (eventName === "Withdraw") {
              allRows.push({
                type: "Withdraw",
                vaultIndex,
                vaultAddress,
                assets: BigInt(String(args.assets ?? 0n)),
                shares: BigInt(String(args.shares ?? 0n)),
                blockNumber: log.blockNumber,
                txHash: log.transactionHash,
              });
            }
          }
        })
      );

      // Sort descending by block number
      allRows.sort((a, b) => (b.blockNumber > a.blockNumber ? 1 : b.blockNumber < a.blockNumber ? -1 : 0));

      setRows(allRows);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to fetch transaction history.");
    } finally {
      setLoading(false);
    }
  }, [client, userVaults]);

  useEffect(() => {
    if (isConnected && isRegistered && userVaults && userVaults.length > 0) {
      fetchLogs();
    }
  }, [isConnected, isRegistered, userVaults, fetchLogs]);

  // ─── Guard: not connected ────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-6 gap-5 text-center">
        <Image src="/logo.svg" alt="ForgeX" width={48} height={48} />
        <h2
          className="text-3xl font-black"
          style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}
        >
          Connect your wallet
        </h2>
        <p style={{ color: "var(--foreground-muted)" }}>
          Connect to view your on-chain transaction history.
        </p>
        <appkit-button />
      </div>
    );
  }

  // ─── Guard: not registered ───────────────────────────────────────────────
  if (!isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-6 gap-5 text-center">
        <Image src="/logo.svg" alt="ForgeX" width={48} height={48} />
        <h2
          className="text-3xl font-black"
          style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}
        >
          Register first
        </h2>
        <p style={{ color: "var(--foreground-muted)" }}>
          You need to register before you can view transaction history.
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
      <div className="max-w-7xl mx-auto px-5 py-8">

        {/* ─── Header ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between mb-8 gap-4 flex-wrap"
        >
          <div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 mb-3 text-xs font-semibold"
              style={{ color: "var(--foreground-muted)" }}
            >
              <ArrowLeft size={12} /> Back to Dashboard
            </Link>
            <span className="label block mb-2">On-Chain Events</span>
            <h1
              className="text-5xl font-black"
              style={{ color: "var(--foreground)", letterSpacing: "-0.04em" }}
            >
              History
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {lastRefreshed && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--foreground-dim)" }}>
                <Clock size={11} />
                {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: "var(--primary-muted)",
                color: "var(--primary)",
                border: "1px solid var(--border)",
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </motion.div>

        {/* ─── Error banner ───────────────────────────────────────────────── */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 px-5 py-4 rounded-xl text-sm font-semibold flex items-center gap-3"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444",
            }}
          >
            <span className="shrink-0">⚠</span>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs underline"
              style={{ color: "#ef4444" }}
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* ─── No vaults empty state ──────────────────────────────────────── */}
        {vaultCount === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-24 flex flex-col items-center gap-4 text-center"
            style={{ border: "2px dashed var(--border)", borderRadius: 20 }}
          >
            <Clock size={36} style={{ color: "var(--primary)", opacity: 0.45 }} />
            <p className="font-bold" style={{ color: "var(--foreground-muted)" }}>
              No vaults found
            </p>
            <p className="text-sm" style={{ color: "var(--foreground-dim)" }}>
              Create a vault first to start seeing transaction history.
            </p>
            <Link href="/dashboard" className="btn btn-primary flex items-center gap-2">
              Go to Dashboard
            </Link>
          </motion.div>
        ) : (
          /* ─── Transactions table ──────────────────────────────────────── */
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div
              variants={item}
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              {/* Table meta bar */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <Clock size={15} style={{ color: "var(--primary)" }} />
                  <span className="font-bold text-sm" style={{ color: "var(--foreground)" }}>
                    Transaction History
                  </span>
                  <span
                    className="pill pill-primary text-xs"
                    style={{ marginLeft: 4 }}
                  >
                    last 50 000 blocks
                  </span>
                </div>
                {!loading && (
                  <span className="text-xs font-semibold" style={{ color: "var(--foreground-dim)" }}>
                    {rows.length} event{rows.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Scrollable table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {[
                        { label: "Type",    cls: "" },
                        { label: "Vault",   cls: "" },
                        { label: "Assets",  cls: "" },
                        { label: "Shares",  cls: "hidden sm:table-cell" },
                        { label: "Block",   cls: "hidden md:table-cell" },
                        { label: "Tx Hash", cls: "" },
                      ].map(({ label, cls }) => (
                        <th
                          key={label}
                          className={`px-4 py-3 text-left font-semibold whitespace-nowrap ${cls}`}
                          style={{ color: "var(--foreground-dim)", fontSize: 11 }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                    ) : rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-16 text-center"
                          style={{ color: "var(--foreground-muted)" }}
                        >
                          <div className="flex flex-col items-center gap-3">
                            <Clock size={28} style={{ color: "var(--border-strong)", opacity: 0.7 }} />
                            <p className="font-semibold">No transactions found</p>
                            <p className="text-xs" style={{ color: "var(--foreground-dim)" }}>
                              No Deposit or Withdraw events in the last 50 000 blocks.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, idx) => (
                        <motion.tr
                          key={`${row.txHash}-${idx}`}
                          variants={item}
                          className="transition-colors"
                          style={{ borderBottom: "1px solid var(--border)" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLTableRowElement).style.background =
                              "rgba(255,255,255,0.025)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                          }}
                        >
                          {/* Type badge */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                              style={
                                row.type === "Deposit"
                                  ? {
                                      background: "rgba(34,197,94,0.12)",
                                      color: "#22c55e",
                                      border: "1px solid rgba(34,197,94,0.25)",
                                    }
                                  : {
                                      background: "rgba(239,68,68,0.12)",
                                      color: "#ef4444",
                                      border: "1px solid rgba(239,68,68,0.25)",
                                    }
                              }
                            >
                              {row.type === "Deposit" ? "↓" : "↑"} {row.type}
                            </span>
                          </td>

                          {/* Vault */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black"
                                style={{
                                  background: "var(--primary-muted)",
                                  color: "var(--primary)",
                                }}
                              >
                                V{row.vaultIndex + 1}
                              </div>
                              <span
                                className="text-xs font-mono"
                                style={{ color: "var(--foreground-dim)" }}
                              >
                                {row.vaultAddress.slice(0, 6)}…{row.vaultAddress.slice(-4)}
                              </span>
                            </div>
                          </td>

                          {/* Assets */}
                          <td className="px-4 py-3 whitespace-nowrap font-semibold" style={{ color: "var(--foreground)" }}>
                            {fmt(row.assets)}
                          </td>

                          {/* Shares — hidden on mobile */}
                          <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell" style={{ color: "var(--foreground-muted)" }}>
                            {fmt(row.shares)}
                          </td>

                          {/* Block — hidden on mobile + tablet */}
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-xs hidden md:table-cell" style={{ color: "var(--foreground-dim)" }}>
                            {row.blockNumber.toLocaleString()}
                          </td>

                          {/* Tx Hash */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <a
                              href={`https://basescan.org/tx/${row.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs font-mono font-semibold transition-colors"
                              style={{ color: "var(--primary)" }}
                              onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLAnchorElement).style.color = "var(--primary-hover)")
                              }
                              onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLAnchorElement).style.color = "var(--primary)")
                              }
                            >
                              {shortHash(row.txHash)}
                              <ExternalLink size={10} />
                            </a>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              {!loading && rows.length > 0 && (
                <div
                  className="px-6 py-3 flex items-center justify-between"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <span className="text-xs" style={{ color: "var(--foreground-dim)" }}>
                    Showing {rows.length} event{rows.length !== 1 ? "s" : ""} across {vaultCount} vault{vaultCount !== 1 ? "s" : ""}
                  </span>
                  <a
                    href="https://basescan.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: "var(--foreground-dim)" }}
                  >
                    View on BaseScan <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
