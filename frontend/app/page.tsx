'use client'

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useIsRegistered } from "@/hooks/useVaultFactory";
import RegisterForm from "@/components/RegisterForm";
import HeroIllustration from "@/components/HeroIllustration";
import Link from "next/link";
import Image from "next/image";
import { Layers, Zap, Cpu, ArrowRight, Shield, TrendingUp, GitBranch } from "lucide-react";

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
  { label: "Protocol", value: "Vult", sub: "ERC-4626" },
  { label: "Network", value: "Base", sub: "L2 · Ethereum" },
  { label: "Hook Version", value: "v1.0", sub: "Uniswap v4" },
  { label: "Yield Sources", value: "2×", sub: "Vault + Fees" },
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
  const { isConnected } = useAccount();
  const { data: isRegistered } = useIsRegistered();

  /* ── Registered & connected ── */
  if (isConnected && isRegistered) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen pt-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-lg"
        >
          <div className="flex justify-center mb-6">
            <Image src="/logo.svg" alt="ForgeX" width={56} height={56} />
          </div>
          <h1 style={{ color: "var(--foreground)", letterSpacing: "-0.04em" }}
              className="text-4xl font-black mb-3">
            Welcome back
          </h1>
          <p style={{ color: "var(--foreground-muted)" }} className="text-base mb-8">
            Your vaults are active. Yield is stacking.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/dashboard" className="btn btn-primary flex items-center gap-2">
              <TrendingUp size={15} /> Dashboard
            </Link>
            <Link href="/vaults" className="btn btn-outline flex items-center gap-2">
              <Layers size={15} /> Vaults
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  /* ── Connected, not registered ── */
  if (isConnected && !isRegistered) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen pt-20 px-6">
        <RegisterForm />
      </main>
    );
  }

  /* ── Not connected — full landing ── */
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
          {/* Badge */}
          <motion.div variants={item} className="mb-6">
            <span className="pill pill-primary">
              <Zap size={10} />
              VultHook · Base Mainnet
            </span>
          </motion.div>

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

          {/* Feature chips */}
          <motion.div variants={item} className="flex flex-wrap gap-2 mb-10">
            {[
              { icon: Layers, label: "ERC-4626" },
              { icon: GitBranch, label: "Uniswap v4 Hooks" },
              { icon: Cpu, label: "AI Analytics" },
              { icon: Shield, label: "Base L2" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground-muted)" }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                <Icon size={11} style={{ color: "var(--primary)" }} />
                {label}
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div variants={item} id="connect-cta" className="flex flex-col gap-3">
            {/* appkit-button handles opening the wallet modal natively */}
            <appkit-button label="Connect Wallet to Launch Vult" />
            <Link href="#how-it-works" className="btn btn-outline text-sm flex items-center gap-2 w-fit">
              How it works <ArrowRight size={13} />
            </Link>
          </motion.div>
        </motion.div>

        {/* Right illustration */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="hidden lg:block"
        >
          <HeroIllustration />
        </motion.div>

        {/* Subtle horizontal divider at bottom */}
        <div
          style={{ background: "var(--border)", height: 1 }}
          className="absolute bottom-0 left-5 right-5"
        />
      </section>

      {/* ── Stats strip ── */}
      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-7xl mx-auto px-5 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              className="flex flex-col gap-0.5"
            >
              <span className="label">{s.label}</span>
              <span style={{ color: "var(--primary)", fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em" }}>
                {s.value}
              </span>
              <span style={{ color: "var(--foreground-muted)", fontSize: 11 }}>{s.sub}</span>
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
          <Image src="/logo.svg" alt="ForgeX" width={48} height={48} className="mx-auto mb-5" />
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
            <Image src="/logo.svg" alt="ForgeX" width={24} height={24} />
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
