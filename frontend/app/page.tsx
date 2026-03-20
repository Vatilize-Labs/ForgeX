'use client'

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Layers, Zap, Cpu, ArrowRight, GitBranch } from "lucide-react";

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
  { icon: Layers,    value: "ERC-4626",  label: "Tokenized Vault Standard", accent: "var(--primary)" },
  { icon: GitBranch, value: "v4 Hook",   label: "Uniswap v4 Native",        accent: "var(--primary)" },
  { icon: Zap,       value: "2× Yield",  label: "Lending + Swap Fees",      accent: "var(--primary)" },
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
      <section className="relative max-w-7xl mx-auto px-5 pt-36 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[85vh]">

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
            className="text-7xl sm:text-8xl font-black mb-6"
          >
            Yield-Native<br />
            <span style={{ color: "var(--primary)" }}>Liquidity</span><br />
            Hooks.
          </motion.h1>

          {/* Sub */}
          <motion.p
            variants={item}
            style={{ color: "var(--foreground-muted)", lineHeight: 1.65 }}
            className="text-xl mb-10 max-w-lg"
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

        {/* Right — hero image */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="hidden lg:flex items-center justify-center relative"
          style={{ minHeight: 560 }}
        >
          {/* Outer glow pulse ring */}
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.18, 0.32, 0.18] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: -24,
              borderRadius: 40,
              background: "radial-gradient(ellipse at center, var(--primary) 0%, transparent 70%)",
              filter: "blur(18px)",
              pointerEvents: "none",
            }}
          />

          {/* Image — gentle float */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "relative" }}
          >
            <Image
              src="/hero-hook.png"
              alt="VultHook"
              width={500}
              height={500}
              style={{
                objectFit: "cover",
                borderRadius: 0,
              }}
              priority
            />
          </motion.div>
        </motion.div>

        {/* Subtle horizontal divider at bottom */}
        <div
          style={{ background: "var(--border)", height: 1 }}
          className="absolute bottom-0 left-5 right-5"
        />
      </section>

      {/* ── Stats strip ── */}
      <section className="px-6 md:px-16 py-6">
        <div
          className="max-w-5xl mx-auto px-10 py-5 flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x rounded-2xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            "--tw-divide-color": "var(--border)",
          } as React.CSSProperties}
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
      <section id="how-it-works" className="max-w-7xl mx-auto px-5 py-28">
        {/* Section header — scroll reveal */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55 }}
          className="mb-14"
        >
          <span className="label block mb-3">How it works</span>
          <h2 style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }} className="text-4xl font-black">
            Three layers.<br />One position.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc, tag }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -6, transition: { duration: 0.22, ease: "easeOut" } }}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                position: "relative",
                overflow: "hidden",
              }}
              className="rounded-2xl p-6 group cursor-default"
            >
              {/* Top glow bar — slides in on hover */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                whileHover={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0,
                  height: 2,
                  background: "linear-gradient(90deg, transparent, var(--primary), transparent)",
                  transformOrigin: "left",
                }}
              />

              {/* Step number */}
              <div
                style={{
                  position: "absolute",
                  top: 18, right: 18,
                  color: "var(--border)",
                  fontWeight: 900,
                  fontSize: 36,
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  userSelect: "none",
                  transition: "color 0.2s",
                }}
                className="group-hover:text-[var(--primary-muted)]"
              >
                0{i + 1}
              </div>

              {/* Icon */}
              <div
                style={{ background: "var(--primary-muted)", borderRadius: 10 }}
                className="w-10 h-10 flex items-center justify-center mb-5"
              >
                <Icon size={18} style={{ color: "var(--primary)" }} />
              </div>

              {/* Tag */}
              <span className="pill pill-accent text-[10px] mb-3 inline-block">{tag}</span>

              <h3
                style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}
                className="mb-2"
              >
                {title}
              </h3>
              <p style={{ color: "var(--foreground-muted)", fontSize: 14, lineHeight: 1.65 }}>{desc}</p>

              {/* Learn more — slides up on hover */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                whileHover={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                style={{ color: "var(--primary)", fontSize: 12, fontWeight: 700 }}
                className="mt-5 flex items-center gap-1"
              >
                Learn more <ArrowRight size={11} />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA strip ── */}
      <section
        style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
        className="py-20 px-5"
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2
            style={{ color: "var(--foreground)", letterSpacing: "-0.04em" }}
            className="text-4xl font-black mb-4"
          >
            Start stacking yield today.
          </h2>
          <p style={{ color: "var(--foreground-muted)" }} className="text-base mb-8">
            Connect your wallet. Create a vault. Let VultHook handle the rest.
          </p>
          <Link href="/dashboard" className="btn btn-primary text-sm inline-flex items-center gap-2">
            <Zap size={14} /> Launch App
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{ borderTop: "1px solid var(--border)" }}
        className="py-8 px-5"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/forgex-logo.png" alt="ForgeX" width={48} height={48} />
            <span style={{ color: "var(--foreground-dim)", fontSize: 24, letterSpacing: "0.06em", fontWeight: 700 }}>
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
