'use client'

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Layers, Zap, Cpu, ArrowRight, GitBranch, Radio, CircleDot } from "lucide-react";

const FEATURES = [
  {
    icon: Layers,
    title: "ERC-4626 Vaults",
    desc: "Tokenized yield-bearing vaults. Deposit once, earn continuously from multiple protocol integrations.",
    tag: "Standard",
  },
  {
    icon: GitBranch,
    title: "Uniswap v4 Hooks",
    desc: "VultHook intercepts every swap and routes a share of fees back into your vault position.",
    tag: "v4 Native",
  },
  {
    icon: Cpu,
    title: "AI Strategy Engine",
    desc: "On-demand AI analysis of your vault portfolio. Risk assessment, yield optimization, rebalancing signals.",
    tag: "AI-Powered",
  },
];

const STATS = [
  { icon: CircleDot, value: "Live",  label: "Deployed on Base Mainnet",   accent: "#22c55e" },
  { icon: Layers,    value: "ERC-4626", label: "Tokenized Vault Standard",  accent: "var(--primary)" },
  { icon: GitBranch, value: "v4 Hook",  label: "Uniswap v4 Native",         accent: "var(--primary)" },
  { icon: Zap,       value: "2× Yield", label: "Lending + Swap Fees",       accent: "var(--primary)" },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── Hero ── */}
      <section className="relative max-w-7xl mx-auto px-5 pt-28 pb-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[92vh]">

        {/* Left copy */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10"
        >

          {/* Headline */}
          <motion.h1
            variants={item}
            style={{ letterSpacing: "-0.04em", lineHeight: 1.0, color: "var(--foreground)" }}
            className="text-6xl sm:text-7xl font-black mb-5"
          >
            Yield-Native<br />
            <span style={{ color: "var(--primary)" }}>Liquidity</span><br />
            Hooks.
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={item}
            style={{ color: "var(--foreground-muted)", lineHeight: 1.65 }}
            className="text-lg mb-8 max-w-md"
          >
            ForgeX stacks ERC-4626 vault interest with Uniswap v4 swap fees into one
            automated position. Two yield sources. One vault.
          </motion.p>

          {/* Flow chips */}
          <motion.div variants={item} className="flex flex-wrap items-center gap-2 mb-10">
            {[
              { icon: Layers, label: "ERC-4626 Vaults" },
              { icon: GitBranch, label: "Uniswap v4 Hook" },
              { icon: Cpu, label: "AI Analytics" },
            ].map(({ icon: Icon, label }, i, arr) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground-muted)" }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                >
                  <Icon size={11} style={{ color: "var(--primary)" }} />
                  {label}
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight size={13} style={{ color: "var(--primary)", opacity: 0.6 }} />
                )}
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div variants={item} className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn btn-primary text-sm flex items-center gap-2">
              <Zap size={14} /> Launch App
            </Link>
            <Link href="#how-it-works" className="btn btn-outline text-sm flex items-center gap-2">
              How it works <ArrowRight size={13} />
            </Link>
          </motion.div>
        </motion.div>

        {/* Right — hero image with floating labels */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="hidden lg:flex items-center justify-center relative"
          style={{ minHeight: 420 }}
        >
          {/* Central image */}
          <div className="relative">
            <Image
              src="/hero-hook.png"
              alt="VultHook"
              width={340}
              height={340}
              className="rounded-3xl"
              style={{ objectFit: "cover" }}
              priority
            />

            {/* Floating label — top left: ERC-4626 */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground-muted)",
                position: "absolute",
                top: -22,
                left: -28,
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm"
            >
              <Layers size={13} style={{ color: "var(--primary)" }} />
              ERC-4626 Vaults
            </motion.div>

            {/* Floating label — top right: Uniswap v4 Hooks */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground-muted)",
                position: "absolute",
                top: 40,
                right: -44,
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm"
            >
              <GitBranch size={13} style={{ color: "var(--primary)" }} />
              Uniswap v4 Hook
            </motion.div>

            {/* Floating label — bottom right: AI Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--foreground-muted)",
                position: "absolute",
                bottom: -22,
                right: -36,
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-sm"
            >
              <Cpu size={13} style={{ color: "var(--primary)" }} />
              AI Analytics
            </motion.div>
          </div>
        </motion.div>

        {/* Subtle horizontal divider at bottom */}
        <div
          style={{ background: "var(--border)", height: 1 }}
          className="absolute bottom-0 left-5 right-5"
        />
      </section>

      {/* ── Stats strip ── */}
      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-5 py-5 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x"
          style={{ "--tw-divide-color": "var(--border)" } as React.CSSProperties}
        >
          {STATS.map(({ icon: Icon, value, label, accent }, i) => (
            <motion.div
              key={value}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex items-center gap-3 flex-1 px-6 py-3 sm:py-0 first:pl-0 last:pr-0"
            >
              <div
                style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, borderRadius: 10 }}
                className="w-9 h-9 flex items-center justify-center shrink-0"
              >
                <Icon size={16} style={{ color: accent }} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span style={{ color: accent, fontWeight: 900, fontSize: 15, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {value}
                </span>
                <span style={{ color: "var(--foreground-muted)", fontSize: 11, lineHeight: 1.3 }}>
                  {label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-5 py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <span className="label block mb-3">How it works</span>
          <h2 style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }} className="text-4xl font-black">
            Three layers.<br />One position.
          </h2>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {FEATURES.map(({ icon: Icon, title, desc, tag }) => (
            <motion.div
              key={title}
              variants={item}
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              className="rounded-2xl p-6 hover:border-[var(--border-strong)] transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  style={{ background: "var(--primary-muted)", borderRadius: 10 }}
                  className="w-10 h-10 flex items-center justify-center"
                >
                  <Icon size={18} style={{ color: "var(--primary)" }} />
                </div>
                <span className="pill pill-accent text-[10px]">{tag}</span>
              </div>
              <h3
                style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}
                className="mb-2"
              >
                {title}
              </h3>
              <p style={{ color: "var(--foreground-muted)", fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
              <div
                style={{ color: "var(--primary)", fontSize: 12, fontWeight: 700 }}
                className="mt-5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Learn more <ArrowRight size={11} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA strip ── */}
      <section
        style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
        className="py-20 px-5"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <Image src="/forgex-logo.png" alt="ForgeX" width={48} height={48} className="mx-auto mb-5" />
          <h2
            style={{ color: "var(--foreground)", letterSpacing: "-0.04em" }}
            className="text-4xl font-black mb-4"
          >
            Start stacking yield today.
          </h2>
          <p style={{ color: "var(--foreground-muted)" }} className="text-base mb-8">
            Connect your wallet. Create a vault. Let VultHook handle the rest.
          </p>
          <appkit-button />
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{ borderTop: "1px solid var(--border)" }}
        className="py-8 px-5"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/forgex-logo.png" alt="ForgeX" width={24} height={24} />
            <span style={{ color: "var(--foreground-dim)", fontSize: 12, letterSpacing: "0.06em", fontWeight: 700 }}>
              FORGEX : VULT
            </span>
          </div>
          <span style={{ color: "var(--foreground-dim)", fontSize: 11 }}>
            © 2026 ForgeX Protocol · Built on Base
          </span>
        </div>
      </footer>
    </div>
  );
}
