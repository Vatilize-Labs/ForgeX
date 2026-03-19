"use client";

import { useState, useEffect } from "react";
import { useCreateVault } from "@/hooks/useVaultFactory";
import { useToast } from "./Toast";
import { WETH_ADDRESS, USDC_ADDRESS, DAI_ADDRESS, USDT_ADDRESS } from "@/lib/constants";

interface CreateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ASSETS = [
  { name: "WETH", address: WETH_ADDRESS, symbol: "WETH" },
  { name: "USDC", address: USDC_ADDRESS, symbol: "USDC" },
  { name: "DAI",  address: DAI_ADDRESS,  symbol: "DAI" },
  { name: "USDT", address: USDT_ADDRESS, symbol: "USDT" },
];

export default function CreateVaultModal({ isOpen, onClose, onSuccess }: CreateVaultModalProps) {
  const [vaultName, setVaultName] = useState("");
  const [vaultSymbol, setVaultSymbol] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const { createVault, isPending, isConfirming, isSuccess, error } = useCreateVault();
  const { showToast } = useToast();

  useEffect(() => {
    if (isSuccess) {
      showToast("Vault created successfully!", "success");
      onSuccess();
      onClose();
      setVaultName("");
      setVaultSymbol("");
    }
  }, [isSuccess]);

  useEffect(() => {
    if (error) {
      showToast(`Failed to create vault: ${error.message.slice(0, 80)}`, "error");
    }
  }, [error]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!vaultName || !vaultSymbol) return;
    createVault(selectedAsset.address, vaultName, vaultSymbol);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md p-8 rounded-3xl bg-background border border-white/10" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-black mb-6">Create New Vault</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Vault Name</label>
            <input
              type="text"
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none transition-all"
              placeholder="e.g. My Yield Vault"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Share Symbol</label>
            <input
              type="text"
              value={vaultSymbol}
              onChange={(e) => setVaultSymbol(e.target.value.toUpperCase())}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:border-primary outline-none transition-all"
              placeholder="e.g. myVLT"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Underlying Asset</label>
            <div className="flex gap-2">
              {ASSETS.map((asset) => (
                <button
                  key={asset.address}
                  onClick={() => setSelectedAsset(asset)}
                  className={`px-4 py-3 rounded-xl font-bold text-sm border transition-all ${
                    selectedAsset.address === asset.address
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                  }`}
                >
                  {asset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!vaultName || !vaultSymbol || isPending || isConfirming}
              className="flex-1 py-4 bg-primary text-white rounded-2xl font-black hover:shadow-[0_0_20px_rgba(255,0,122,0.4)] transition-all disabled:opacity-50"
            >
              {isPending || isConfirming ? "Creating..." : "Create Vault"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
