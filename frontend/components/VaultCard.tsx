"use client";

import { useState, useEffect } from "react";
import { formatEther, parseEther } from "viem";
import { useVaultData, useVaultDeposit, useVaultWithdraw, useDeployToAave, useDeployToCompound, useWithdrawFromAave, useWithdrawFromCompound } from "@/hooks/useUserVault";
import { useToast } from "./Toast";

interface VaultCardProps {
  vaultAddress: `0x${string}`;
  index: number;
}

export default function VaultCard({ vaultAddress, index }: VaultCardProps) {
  const vault = useVaultData(vaultAddress);
  const deposit = useVaultDeposit(vaultAddress);
  const withdraw = useVaultWithdraw(vaultAddress);
  const aaveDeploy = useDeployToAave(vaultAddress);
  const compoundDeploy = useDeployToCompound(vaultAddress);
  const aaveWithdraw = useWithdrawFromAave(vaultAddress);
  const compoundWithdraw = useWithdrawFromCompound(vaultAddress);
  const { showToast } = useToast();

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocateAmount, setAllocateAmount] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "depositing">("idle");

  // Handle deposit flow: approve then deposit
  useEffect(() => {
    if (deposit.approveConfirmed && step === "approving") {
      setStep("depositing");
      const amount = parseEther(depositAmount);
      deposit.deposit(amount);
    }
  }, [deposit.approveConfirmed]);

  useEffect(() => {
    if (deposit.depositConfirmed) {
      showToast("Deposit successful!", "success");
      setDepositAmount("");
      setShowDeposit(false);
      setStep("idle");
      vault.refetch();
    }
  }, [deposit.depositConfirmed]);

  useEffect(() => {
    if (withdraw.isSuccess) {
      showToast("Withdrawal successful!", "success");
      setWithdrawAmount("");
      setShowWithdraw(false);
      vault.refetch();
    }
  }, [withdraw.isSuccess]);

  // Protocol deploy/withdraw success
  useEffect(() => {
    if (aaveDeploy.isSuccess) {
      showToast("Deployed to Aave!", "success");
      setAllocateAmount("");
      vault.refetch();
    }
  }, [aaveDeploy.isSuccess]);

  useEffect(() => {
    if (compoundDeploy.isSuccess) {
      showToast("Deployed to Compound!", "success");
      setAllocateAmount("");
      vault.refetch();
    }
  }, [compoundDeploy.isSuccess]);

  useEffect(() => {
    if (aaveWithdraw.isSuccess) {
      showToast("Withdrawn from Aave!", "success");
      vault.refetch();
    }
  }, [aaveWithdraw.isSuccess]);

  useEffect(() => {
    if (compoundWithdraw.isSuccess) {
      showToast("Withdrawn from Compound!", "success");
      vault.refetch();
    }
  }, [compoundWithdraw.isSuccess]);

  // Error handling
  useEffect(() => {
    if (deposit.error) {
      showToast(`Deposit failed: ${deposit.error.message.slice(0, 80)}`, "error");
      setStep("idle");
    }
    if (withdraw.error) {
      showToast(`Withdraw failed: ${withdraw.error.message.slice(0, 80)}`, "error");
    }
  }, [deposit.error, withdraw.error]);

  useEffect(() => {
    if (aaveDeploy.error) showToast(`Aave deploy failed: ${aaveDeploy.error.message.slice(0, 80)}`, "error");
    if (compoundDeploy.error) showToast(`Compound deploy failed: ${compoundDeploy.error.message.slice(0, 80)}`, "error");
    if (aaveWithdraw.error) showToast(`Aave withdraw failed: ${aaveWithdraw.error.message.slice(0, 80)}`, "error");
    if (compoundWithdraw.error) showToast(`Compound withdraw failed: ${compoundWithdraw.error.message.slice(0, 80)}`, "error");
  }, [aaveDeploy.error, compoundDeploy.error, aaveWithdraw.error, compoundWithdraw.error]);

  const handleDeposit = () => {
    if (!depositAmount || !vault.assetAddress) return;
    const amount = parseEther(depositAmount);
    setStep("approving");
    deposit.approve(vault.assetAddress as `0x${string}`, amount);
  };

  const handleWithdraw = () => {
    if (!withdrawAmount) return;
    withdraw.withdraw(parseEther(withdrawAmount));
  };

  const formatUSD = (val: bigint | undefined) => {
    if (!val) return "$0.00";
    return `$${Number(formatEther(val)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTokens = (val: bigint | undefined) => {
    if (!val) return "0";
    return Number(formatEther(val)).toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const anyPending = aaveDeploy.isPending || compoundDeploy.isPending || aaveWithdraw.isPending || compoundWithdraw.isPending;

  return (
    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold text-lg">
          V{index + 1}
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-gray-500 bg-black/20 px-3 py-1 rounded-full group-hover:text-primary transition-colors">
            {vaultAddress.slice(0, 6)}...{vaultAddress.slice(-4)}
          </div>
          {vault.isPaused && (
            <div className="text-xs text-red-400 mt-1 font-bold">PAUSED</div>
          )}
        </div>
      </div>

      <h3 className="text-xl font-black mb-1">ERC-4626 Vault</h3>

      <div className="grid grid-cols-2 gap-3 my-4 text-sm">
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-gray-500 text-xs font-bold">Total Assets</div>
          <div className="text-white font-bold">{formatTokens(vault.totalAssets)}</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-gray-500 text-xs font-bold">Value (USD)</div>
          <div className="text-accent font-bold">{formatUSD(vault.totalValueUSD)}</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-gray-500 text-xs font-bold">Your Shares</div>
          <div className="text-white font-bold">{formatTokens(vault.userShares)}</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-gray-500 text-xs font-bold">Share Price</div>
          <div className="text-secondary font-bold">{formatUSD(vault.sharePriceUSD)}</div>
        </div>
      </div>

      {/* Protocol allocation breakdown */}
      <div className="flex gap-2 mb-4 text-xs">
        <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg font-bold">
          Aave: {formatTokens(vault.aaveBalance)}
        </span>
        <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded-lg font-bold">
          Compound: {formatTokens(vault.compoundBalance)}
        </span>
      </div>

      {/* Deposit Section */}
      {showDeposit && (
        <div className="mb-3 p-3 bg-black/30 rounded-xl space-y-2">
          <input
            type="number"
            placeholder="Amount to deposit"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="w-full p-3 rounded-lg bg-background border border-white/10 focus:border-primary outline-none text-sm"
          />
          <button
            onClick={handleDeposit}
            disabled={!depositAmount || deposit.isApproving || deposit.isDepositing}
            className="w-full py-2 bg-primary text-white rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {step === "approving" ? "Approving..." : step === "depositing" ? "Depositing..." : "Confirm Deposit"}
          </button>
        </div>
      )}

      {/* Withdraw Section */}
      {showWithdraw && (
        <div className="mb-3 p-3 bg-black/30 rounded-xl space-y-2">
          <input
            type="number"
            placeholder="Amount to withdraw"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="w-full p-3 rounded-lg bg-background border border-white/10 focus:border-primary outline-none text-sm"
          />
          <button
            onClick={handleWithdraw}
            disabled={!withdrawAmount || withdraw.isPending}
            className="w-full py-2 bg-secondary text-white rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {withdraw.isPending ? "Withdrawing..." : "Confirm Withdraw"}
          </button>
        </div>
      )}

      {/* Protocol Allocation Section */}
      {showAllocate && (
        <div className="mb-3 p-3 bg-black/30 rounded-xl space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Allocate to Protocol</div>
          <input
            type="number"
            placeholder="Amount to allocate"
            value={allocateAmount}
            onChange={(e) => setAllocateAmount(e.target.value)}
            className="w-full p-3 rounded-lg bg-background border border-white/10 focus:border-primary outline-none text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { if (allocateAmount) aaveDeploy.deploy(parseEther(allocateAmount)); }}
              disabled={!allocateAmount || anyPending}
              className="py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-lg font-bold text-xs disabled:opacity-50 hover:bg-purple-500/30 transition-colors"
            >
              {aaveDeploy.isPending ? "Deploying..." : "Deploy to Aave"}
            </button>
            <button
              onClick={() => { if (allocateAmount) compoundDeploy.deploy(parseEther(allocateAmount)); }}
              disabled={!allocateAmount || anyPending}
              className="py-2 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg font-bold text-xs disabled:opacity-50 hover:bg-green-500/30 transition-colors"
            >
              {compoundDeploy.isPending ? "Deploying..." : "Deploy to Compound"}
            </button>
          </div>
          {/* Withdraw from protocols */}
          {(vault.aaveBalance && vault.aaveBalance > 0n) || (vault.compoundBalance && vault.compoundBalance > 0n) ? (
            <>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2">Withdraw from Protocol</div>
              <div className="grid grid-cols-2 gap-2">
                {vault.aaveBalance && vault.aaveBalance > 0n && (
                  <button
                    onClick={() => { if (allocateAmount) aaveWithdraw.withdraw(parseEther(allocateAmount)); }}
                    disabled={!allocateAmount || anyPending}
                    className="py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg font-bold text-xs disabled:opacity-50 hover:bg-purple-500/20 transition-colors"
                  >
                    {aaveWithdraw.isPending ? "Withdrawing..." : "From Aave"}
                  </button>
                )}
                {vault.compoundBalance && vault.compoundBalance > 0n && (
                  <button
                    onClick={() => { if (allocateAmount) compoundWithdraw.withdraw(parseEther(allocateAmount)); }}
                    disabled={!allocateAmount || anyPending}
                    className="py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg font-bold text-xs disabled:opacity-50 hover:bg-green-500/20 transition-colors"
                  >
                    {compoundWithdraw.isPending ? "Withdrawing..." : "From Compound"}
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => { setShowDeposit(!showDeposit); setShowWithdraw(false); setShowAllocate(false); }}
          className="flex-1 py-3 bg-primary/10 border border-primary/20 rounded-xl font-bold text-primary hover:bg-primary/20 transition-all text-sm"
        >
          Deposit
        </button>
        <button
          onClick={() => { setShowWithdraw(!showWithdraw); setShowDeposit(false); setShowAllocate(false); }}
          className="flex-1 py-3 bg-secondary/10 border border-secondary/20 rounded-xl font-bold text-secondary hover:bg-secondary/20 transition-all text-sm"
        >
          Withdraw
        </button>
        <button
          onClick={() => { setShowAllocate(!showAllocate); setShowDeposit(false); setShowWithdraw(false); }}
          className="flex-1 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl font-bold text-blue-400 hover:bg-blue-500/20 transition-all text-sm"
        >
          Allocate
        </button>
      </div>
    </div>
  );
}
