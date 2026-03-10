'use client'

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { VAULT_FACTORY_ABI, USER_VAULT_ABI } from "@/lib/abis";
import { VAULT_FACTORY_ADDRESS } from "@/lib/constants";
import { formatEther, parseEther } from "viem";

export default function Home() {
  const { address, isConnected } = useAccount();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Check if user is registered
  const { data: isRegistered, refetch: refetchRegistration } = useReadContract({
    address: VAULT_FACTORY_ADDRESS,
    abi: VAULT_FACTORY_ABI,
    functionName: "isUserRegistered",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
    }
  });

  // Get user vaults
  const { data: userVaults, refetch: refetchVaults } = useReadContract({
    address: VAULT_FACTORY_ADDRESS,
    abi: VAULT_FACTORY_ABI,
    functionName: "getUserVaults",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address && !!isRegistered,
    }
  });

  const { writeContract: writeRegister, data: registerHash } = useWriteContract();
  const { isLoading: isRegisteringTx } = useWaitForTransactionReceipt({ hash: registerHash });

  const { writeContract: writeCreateVault, data: createVaultHash } = useWriteContract();
  const { isLoading: isCreatingVaultTx } = useWaitForTransactionReceipt({ hash: createVaultHash });

  useEffect(() => {
    if (registerHash) refetchRegistration();
  }, [registerHash]);

  useEffect(() => {
    if (createVaultHash) refetchVaults();
  }, [createVaultHash]);

  const handleRegister = () => {
    if (!username || !bio) return;
    writeRegister({
      address: VAULT_FACTORY_ADDRESS,
      abi: VAULT_FACTORY_ABI,
      functionName: "registerUser",
      args: [username, bio],
    });
  };

  const handleCreateVault = () => {
    // For demo, creating a vault for a dummy asset or WETH
    writeCreateVault({
      address: VAULT_FACTORY_ADDRESS,
      abi: VAULT_FACTORY_ABI,
      functionName: "createVault",
      args: ["0x4200000000000000000000000000000000000006", "My Vault", "mVLT"], // WETH on Base
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background text-foreground font-sans pt-32 p-6">
      <header className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center max-w-7xl mx-auto w-full z-10 backdrop-blur-md border-b border-white/5">
        <div className="text-2xl font-black text-primary flex items-center gap-2 tracking-tighter">
          <div className="w-8 h-8 bg-primary rounded-md shadow-[0_0_15px_rgba(255,0,122,0.4)]"></div>
          FORGEX <span className="text-secondary">:</span> VULT
        </div>
        <div className="flex gap-4">
          <appkit-button />
        </div>
      </header>

      <main className="flex flex-col items-center justify-center w-full max-w-5xl relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10"></div>
        
        {!isConnected ? (
          <div className="text-center py-20">
            <h1 className="text-6xl sm:text-7xl font-black tracking-tighter mb-8 leading-[0.9]">
              Yield-Native <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">Liquidity Hooks</span>
            </h1>
            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
              Welcome to the future of capital efficiency on Base. Connect your wallet to start creating vaults and earning yield with Uniswap v4.
            </p>
            <appkit-button />
          </div>
        ) : !isRegistered ? (
          <div className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <h2 className="text-3xl font-black mb-6">Create Your Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-4 rounded-xl bg-background border border-white/10 focus:border-primary outline-none transition-all"
                  placeholder="e.g. Satoshi"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Short Bio</label>
                <input 
                  type="text" 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-4 rounded-xl bg-background border border-white/10 focus:border-primary outline-none transition-all"
                  placeholder="e.g. DeFi Enthusiast"
                />
              </div>
              <button 
                onClick={handleRegister}
                disabled={isRegisteringTx || !username || !bio}
                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-lg hover:shadow-[0_0_20px_rgba(255,0,122,0.4)] transition-all disabled:opacity-50"
              >
                {isRegisteringTx ? "Registering..." : "Join ForgeX"}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex justify-between items-end mb-12">
              <div>
                <div className="text-accent text-xs font-bold tracking-widest uppercase mb-2">Welcome Back</div>
                <h1 className="text-5xl font-black tracking-tighter">Your Dashboard</h1>
              </div>
              <button 
                onClick={handleCreateVault}
                disabled={isCreatingVaultTx}
                className="px-8 py-4 bg-secondary text-white rounded-2xl font-black hover:shadow-[0_0_20px_rgba(14,167,203,0.4)] transition-all disabled:opacity-50"
              >
                {isCreatingVaultTx ? "Creating..." : "+ New Vault"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {userVaults && userVaults.length > 0 ? (
                userVaults.map((vault: string, index: number) => (
                  <div key={index} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold">
                        V{index + 1}
                      </div>
                      <div className="text-xs font-mono text-gray-500 bg-black/20 px-3 py-1 rounded-full group-hover:text-primary transition-colors">
                        {vault.slice(0, 6)}...{vault.slice(-4)}
                      </div>
                    </div>
                    <h3 className="text-2xl font-black mb-2">ERC-4626 Vault</h3>
                    <div className="flex gap-4 mt-6">
                      <button className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all">Deposit</button>
                      <button className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all">Withdraw</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-white/5">
                  <div className="text-gray-500 font-bold mb-4">No vaults found yet.</div>
                  <button 
                    onClick={handleCreateVault}
                    className="text-primary font-black uppercase tracking-tighter hover:underline"
                  >
                    Create your first vault &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-20 p-8 text-center text-gray-600 text-xs font-bold tracking-widest uppercase">
        &copy; 2026 ForgeX Protocol &bull; Vult Systems &bull; Built on Base
      </footer>
    </div>
  );
}
