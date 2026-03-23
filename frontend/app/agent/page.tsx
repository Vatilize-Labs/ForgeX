'use client'

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useUserVaults, useIsRegistered } from "@/hooks/useVaultFactory";
import SecurityNotice from "@/components/SecurityNotice";
import Image from "next/image";
import {
  Bot, Play, Square, RefreshCw, Shield, Zap, Clock,
  AlertTriangle, CheckCircle, XCircle, Activity, Brain,
  TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  startAgent, stopAgent, getAgentStatus, triggerAgentCycle,
  type AgentStatus, type AgentDecision,
} from "@/lib/ai";

const RISK_PROFILES = [
  { value: "conservative", label: "Conservative", desc: "Prioritize capital preservation, low-risk lending" },
  { value: "balanced", label: "Balanced", desc: "50/50 risk allocation across protocols" },
  { value: "aggressive", label: "Aggressive", desc: "Maximize yield, higher protocol exposure" },
];

const URGENCY_COLORS: Record<string, string> = {
  low: "rgba(34,197,94,0.15)",
  medium: "rgba(234,179,8,0.15)",
  high: "rgba(239,68,68,0.15)",
};

const URGENCY_TEXT_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#ef4444",
};

const DECISION_ICONS: Record<string, typeof CheckCircle> = {
  no_action: CheckCircle,
  rebalance: RefreshCw,
  deploy_aave: TrendingUp,
  deploy_compound: TrendingUp,
  deposit: Zap,
  withdraw: AlertTriangle,
  error: XCircle,
};

export default function AgentPage() {
  const { address, isConnected } = useAccount();
  const { data: isRegistered } = useIsRegistered();
  const { data: userVaults } = useUserVaults();

  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [riskProfile, setRiskProfile] = useState("balanced");
  const [interval, setInterval_] = useState(60);
  const [simulate, setSimulate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDecision, setExpandedDecision] = useState<number | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await getAgentStatus();
      setStatus(s);
    } catch {
      // Agent might not be reachable
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = window.setInterval(fetchStatus, 5000);
    return () => window.clearInterval(timer);
  }, [fetchStatus]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-6 gap-5 text-center">
        <Image src="/logo.svg" alt="ForgeX" width={48} height={48} />
        <h2 style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }} className="text-3xl font-black">
          Connect your wallet
        </h2>
        <p style={{ color: "var(--foreground-muted)" }}>Connect to access the autonomous DeFi agent.</p>
        <appkit-button />
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-6 gap-5 text-center">
        <Bot size={48} style={{ color: "var(--primary)" }} />
        <h2 style={{ color: "var(--foreground)" }} className="text-2xl font-black">
          Register first
        </h2>
        <p style={{ color: "var(--foreground-muted)" }}>Register on the Dashboard to use the agent.</p>
      </div>
    );
  }

  const vaultList = userVaults || [];
  const isRunning = status?.running ?? false;

  const handleStart = async () => {
    if (!address || vaultList.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      await startAgent(address, vaultList as string[], riskProfile, interval, simulate);
      await fetchStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start agent");
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await stopAgent();
      await fetchStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to stop agent");
    }
    setLoading(false);
  };

  const handleManualCycle = async () => {
    setLoading(true);
    setError(null);
    try {
      await triggerAgentCycle();
      await fetchStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to run cycle");
    }
    setLoading(false);
  };

  const decisions = status?.recent_decisions ?? [];

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-5 py-8">
        <SecurityNotice />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <span className="label block mb-2">Autonomous DeFi Agent</span>
            <h1 style={{ color: "var(--foreground)", letterSpacing: "-0.04em" }} className="text-5xl font-black">
              Agent
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && status?.simulate && (
              <span
                style={{
                  background: "rgba(234,179,8,0.12)",
                  border: "1px solid rgba(234,179,8,0.25)",
                  color: "#eab308",
                }}
                className="px-3 py-2 rounded-lg text-xs font-bold"
              >
                SIMULATION
              </span>
            )}
            <span
              style={{
                background: isRunning ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                border: `1px solid ${isRunning ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                color: isRunning ? "#22c55e" : "#ef4444",
              }}
              className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <Activity size={12} />
              {isRunning ? "RUNNING" : "STOPPED"}
            </span>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
            className="rounded-xl p-4 mb-6 text-sm font-medium"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Controls */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:col-span-1 space-y-4"
          >
            {/* Agent Config */}
            <div
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              className="rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Brain size={16} style={{ color: "var(--primary)" }} />
                <h3 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 16 }}>
                  Agent Configuration
                </h3>
              </div>

              {/* Risk Profile */}
              <div className="mb-4">
                <label className="label block mb-2">Risk Profile</label>
                <div className="space-y-2">
                  {RISK_PROFILES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setRiskProfile(p.value)}
                      disabled={isRunning}
                      style={{
                        background: riskProfile === p.value ? "var(--primary-muted)" : "transparent",
                        border: `1px solid ${riskProfile === p.value ? "var(--primary)" : "var(--border)"}`,
                        opacity: isRunning ? 0.5 : 1,
                      }}
                      className="w-full text-left rounded-lg p-3 transition-all"
                    >
                      <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: 13 }}>
                        {p.label}
                      </span>
                      <p style={{ color: "var(--foreground-dim)", fontSize: 11, marginTop: 2 }}>
                        {p.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval */}
              <div className="mb-4">
                <label className="label block mb-2">Check Interval (seconds)</label>
                <input
                  type="number"
                  min={30}
                  max={600}
                  value={interval}
                  onChange={(e) => setInterval_(Math.max(30, parseInt(e.target.value) || 60))}
                  disabled={isRunning}
                  style={{
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    opacity: isRunning ? 0.5 : 1,
                  }}
                  className="w-full rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>

              {/* Simulation Toggle */}
              <div className="mb-4">
                <label className="label block mb-2">Execution Mode</label>
                <button
                  onClick={() => !isRunning && setSimulate(!simulate)}
                  disabled={isRunning}
                  style={{
                    background: simulate ? "rgba(234,179,8,0.1)" : "rgba(34,197,94,0.1)",
                    border: `1px solid ${simulate ? "rgba(234,179,8,0.3)" : "rgba(34,197,94,0.3)"}`,
                    opacity: isRunning ? 0.5 : 1,
                  }}
                  className="w-full text-left rounded-lg p-3 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span style={{ color: simulate ? "#eab308" : "#22c55e", fontWeight: 700, fontSize: 13 }}>
                      {simulate ? "Simulation Mode" : "Live Execution"}
                    </span>
                    <span
                      style={{
                        background: simulate ? "rgba(234,179,8,0.2)" : "rgba(34,197,94,0.2)",
                        color: simulate ? "#eab308" : "#22c55e",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {simulate ? "SAFE" : "LIVE"}
                    </span>
                  </div>
                  <p style={{ color: "var(--foreground-dim)", fontSize: 11, marginTop: 4 }}>
                    {simulate
                      ? "Agent reasons and decides, but does NOT execute on-chain. Perfect for demos."
                      : "Agent will execute real on-chain transactions via WDK wallet."}
                  </p>
                </button>
              </div>

              {/* Vaults */}
              <div className="mb-4">
                <label className="label block mb-2">Monitored Vaults</label>
                {vaultList.length > 0 ? (
                  <div className="space-y-1">
                    {vaultList.map((v: string) => (
                      <div
                        key={v}
                        style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                        className="rounded-lg px-3 py-2 font-mono text-xs truncate"
                      >
                        <span style={{ color: "var(--foreground-muted)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--foreground-dim)", fontSize: 12 }}>
                    Create vaults on the Dashboard first.
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {!isRunning ? (
                  <button
                    onClick={handleStart}
                    disabled={loading || vaultList.length === 0}
                    className="btn btn-primary flex items-center gap-2 flex-1"
                    style={{ opacity: loading || vaultList.length === 0 ? 0.5 : 1 }}
                  >
                    <Play size={14} />
                    {loading ? "Starting..." : "Start Agent"}
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    disabled={loading}
                    style={{
                      background: "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444",
                      opacity: loading ? 0.5 : 1,
                    }}
                    className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                  >
                    <Square size={14} />
                    {loading ? "Stopping..." : "Stop Agent"}
                  </button>
                )}
                <button
                  onClick={handleManualCycle}
                  disabled={loading}
                  style={{
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground-muted)",
                    opacity: loading ? 0.5 : 1,
                  }}
                  className="px-3 py-2.5 rounded-lg transition-all"
                  title="Run one cycle manually"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Agent Stats */}
            {status && (
              <div
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                className="rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={16} style={{ color: "var(--primary)" }} />
                  <h3 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 16 }}>
                    Stats
                  </h3>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Mode", value: status.simulate ? "Simulation" : "Live" },
                    { label: "Cycles Completed", value: status.cycle_count },
                    { label: "Risk Profile", value: status.risk_profile },
                    { label: "Check Interval", value: `${status.interval_seconds}s` },
                    { label: "Last Check", value: status.last_check
                      ? new Date(status.last_check).toLocaleTimeString()
                      : "Never"
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span style={{ color: "var(--foreground-dim)", fontSize: 12, fontWeight: 600 }}>
                        {label}
                      </span>
                      <span style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 700 }} className="font-mono">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right: Decision Log */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center gap-2 mb-4">
              <h2 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>
                Decision Log
              </h2>
              <span className="pill pill-primary">{decisions.length} decisions</span>
            </div>

            {decisions.length > 0 ? (
              <div className="space-y-3">
                {decisions.map((d: AgentDecision, i: number) => {
                  const DecisionIcon = DECISION_ICONS[d.decision] || Brain;
                  const isExpanded = expandedDecision === i;

                  return (
                    <motion.div
                      key={`${d.timestamp}-${i}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                      className="rounded-xl overflow-hidden"
                    >
                      {/* Decision header */}
                      <button
                        onClick={() => setExpandedDecision(isExpanded ? null : i)}
                        className="w-full text-left p-4 flex items-start gap-3 transition-all hover:opacity-90"
                      >
                        <div
                          style={{
                            background: URGENCY_COLORS[d.urgency] || "var(--primary-muted)",
                            borderRadius: 10,
                          }}
                          className="w-9 h-9 shrink-0 flex items-center justify-center mt-0.5"
                        >
                          <DecisionIcon
                            size={16}
                            style={{ color: URGENCY_TEXT_COLORS[d.urgency] || "var(--primary)" }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 14 }}>
                              {d.decision.replace(/_/g, " ").toUpperCase()}
                            </span>
                            {d.confidence > 0 && (
                              <span
                                style={{
                                  background: "var(--primary-muted)",
                                  color: "var(--primary)",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "1px 6px",
                                  borderRadius: 999,
                                }}
                              >
                                {(d.confidence * 100).toFixed(0)}% conf
                              </span>
                            )}
                            <span
                              style={{
                                background: URGENCY_COLORS[d.urgency],
                                color: URGENCY_TEXT_COLORS[d.urgency],
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 999,
                              }}
                            >
                              {d.urgency}
                            </span>
                          </div>
                          <p style={{ color: "var(--foreground-muted)", fontSize: 12, lineHeight: 1.5 }}>
                            {d.reasoning}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span style={{ color: "var(--foreground-dim)", fontSize: 10 }} className="font-mono">
                            {new Date(d.timestamp).toLocaleTimeString()}
                          </span>
                          {isExpanded ? <ChevronUp size={14} style={{ color: "var(--foreground-dim)" }} /> : <ChevronDown size={14} style={{ color: "var(--foreground-dim)" }} />}
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div
                          style={{ borderTop: "1px solid var(--border)", background: "var(--background)" }}
                          className="p-4 space-y-3"
                        >
                          {d.market_observation && (
                            <div>
                              <span className="label block mb-1">Market Observation</span>
                              <p style={{ color: "var(--foreground-muted)", fontSize: 12 }}>
                                {d.market_observation}
                              </p>
                            </div>
                          )}
                          {d.risk_assessment && (
                            <div>
                              <span className="label block mb-1">Risk Assessment</span>
                              <p style={{ color: "var(--foreground-muted)", fontSize: 12 }}>
                                {d.risk_assessment}
                              </p>
                            </div>
                          )}
                          {d.actions_planned > 0 && (
                            <div>
                              <span className="label block mb-1">
                                {(d.execution_results[0] as Record<string, unknown>)?.simulated ? "Simulated Actions" : "Actions Executed"}
                              </span>
                              <p style={{ color: "var(--foreground-muted)", fontSize: 12 }}>
                                {d.actions_planned} action(s) planned
                              </p>
                              {d.execution_results.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {d.execution_results.map((r, j) => {
                                    const result = r as Record<string, unknown>;
                                    const isSim = result.simulated === true;
                                    return (
                                      <div
                                        key={j}
                                        style={{
                                          background: isSim ? "rgba(234,179,8,0.06)" : "var(--card)",
                                          border: `1px solid ${isSim ? "rgba(234,179,8,0.2)" : "var(--border)"}`,
                                          fontSize: 11,
                                          color: isSim ? "#eab308" : "var(--foreground-muted)",
                                        }}
                                        className="rounded-lg p-2 font-mono"
                                      >
                                        {isSim
                                          ? String(result.message)
                                          : JSON.stringify(r, null, 0)}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                          <div>
                            <span className="label block mb-1">Timestamp</span>
                            <p style={{ color: "var(--foreground-dim)", fontSize: 11 }} className="font-mono">
                              {d.timestamp}
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ border: "2px dashed var(--border)", borderRadius: 20 }}
                className="py-20 flex flex-col items-center justify-center text-center gap-4"
              >
                <div
                  style={{ background: "var(--primary-muted)", borderRadius: 14 }}
                  className="w-12 h-12 flex items-center justify-center"
                >
                  <Bot size={22} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <p style={{ color: "var(--foreground-muted)", fontWeight: 700, marginBottom: 6 }}>
                    No decisions yet
                  </p>
                  <p style={{ color: "var(--foreground-dim)", fontSize: 13 }}>
                    Start the agent or run a manual cycle to see autonomous decisions.
                  </p>
                </div>
              </motion.div>
            )}

            {/* How it works */}
            <div
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              className="rounded-2xl p-5 mt-6"
            >
              <h3 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
                How the Agent Works
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                  { icon: Clock, label: "Monitor", desc: "Reads vault state from Base every cycle" },
                  { icon: Brain, label: "Reason", desc: "Claude AI analyzes yields, risk, opportunity" },
                  { icon: Shield, label: "Decide", desc: "Decides WHEN and WHY to act — or wait" },
                  { icon: Zap, label: "Execute", desc: "WDK wallet signs & executes transactions" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="text-center">
                    <div
                      style={{ background: "var(--primary-muted)", borderRadius: 12 }}
                      className="w-10 h-10 flex items-center justify-center mx-auto mb-2"
                    >
                      <Icon size={18} style={{ color: "var(--primary)" }} />
                    </div>
                    <p style={{ color: "var(--foreground)", fontWeight: 700, fontSize: 13 }}>{label}</p>
                    <p style={{ color: "var(--foreground-dim)", fontSize: 11, marginTop: 2 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
