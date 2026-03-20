'use client'

import { useState } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useUserVaults, useIsRegistered } from "@/hooks/useVaultFactory";
import VaultCard from "@/components/VaultCard";
import CreateVaultModal from "@/components/CreateVaultModal";
import SecurityNotice from "@/components/SecurityNotice";
import Link from "next/link";
import Image from "next/image";
import { Layers, Plus, Vault, ArrowRight } from "lucide-react";

import type { Variants } from "framer-motion";
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function VaultsPage() {
  const { isConnected } = useAccount();
  const { data: isRegistered } = useIsRegistered();
  const { data: userVaults, refetch: refetchVaults } = useUserVaults();
  const [showCreateModal, setShowCreateModal] = useState(false);

  /* ── Not connected ── */
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-6 gap-5 text-center">
        <Image src="/logo.svg" alt="ForgeX" width={48} height={48} />
        <h2 style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }} className="text-3xl font-black">
          Connect your wallet
        </h2>
        <p style={{ color: "var(--foreground-muted)" }}>Connect to view and manage your vaults.</p>
        <appkit-button />
      </div>
    );
  }

  /* ── Not registered ── */
  if (!isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pt-20 px-6 gap-5 text-center">
        <Image src="/logo.svg" alt="ForgeX" width={48} height={48} />
        <h2 style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }} className="text-3xl font-black">
          Not registered
        </h2>
        <p style={{ color: "var(--foreground-muted)" }}>Register first to create and manage vaults.</p>
        <Link href="/" className="btn btn-primary">Go to Registration</Link>
      </div>
    );
  }

  const vaultCount = userVaults?.length ?? 0;

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-5 py-8">

        <SecurityNotice />

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <span className="label block mb-2">Vault Management</span>
            <h1 style={{ color: "var(--foreground)", letterSpacing: "-0.04em" }} className="text-5xl font-black">
              Your Vaults
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="pill pill-primary">{vaultCount} vault{vaultCount !== 1 ? "s" : ""}</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={15} /> Create Vault
            </button>
          </div>
        </motion.div>

        {/* ── Info strip ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 }}
          className="flex flex-wrap items-center gap-6 px-5 py-4 mb-8"
        >
          {[
            { label: "Standard",    value: "ERC-4626" },
            { label: "Network",     value: "Base Mainnet" },
            { label: "Hook",        value: "VultHook v1" },
            { label: "Yield Sources", value: "Vault + Swap Fees" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="label">{label}</span>
              <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: 13 }}>{value}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Vault grid ── */}
        {vaultCount > 0 ? (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {userVaults!.map((vault: string, index: number) => (
              <motion.div key={vault} variants={item}>
                <VaultCard vaultAddress={vault as `0x${string}`} index={index} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            style={{ border: "2px dashed var(--border)", borderRadius: 24 }}
            className="py-28 flex flex-col items-center justify-center text-center gap-5"
          >
            <div
              style={{ background: "var(--primary-muted)", borderRadius: 16 }}
              className="w-14 h-14 flex items-center justify-center"
            >
              <Vault size={26} style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <p style={{ color: "var(--foreground)", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>
                No vaults created yet
              </p>
              <p style={{ color: "var(--foreground-muted)", fontSize: 14, maxWidth: 320 }}>
                Create your first ERC-4626 vault to start stacking vault yield and Uniswap v4 swap fees.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-2 mt-2"
            >
              <Plus size={15} /> Create Your First Vault
            </button>
            <Link
              href="/#how-it-works"
              style={{ color: "var(--foreground-muted)", fontSize: 13 }}
              className="flex items-center gap-1 hover:text-[var(--primary)] transition-colors"
            >
              Learn how vaults work <ArrowRight size={12} />
            </Link>
          </motion.div>
        )}
      </div>

      <CreateVaultModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetchVaults()}
      />
    </div>
  );
}
