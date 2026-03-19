"use client";

import { useState, useEffect } from "react";
import { useRegisterUser } from "@/hooks/useVaultFactory";
import { useToast } from "./Toast";

export default function RegisterForm({ onSuccess: onSuccessCallback }: { onSuccess?: () => void } = {}) {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const { register, isPending, isConfirming, isSuccess, error } = useRegisterUser();
  const { showToast } = useToast();

  useEffect(() => {
    if (isSuccess) {
      showToast("Registration successful! Welcome to ForgeX.", "success");
      onSuccessCallback?.();
    }
  }, [isSuccess]);

  useEffect(() => {
    if (error) {
      showToast(`Registration failed: ${error.message.slice(0, 80)}`, "error");
    }
  }, [error]);

  const handleRegister = () => {
    if (!username || !bio) return;
    register(username, bio);
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
      <h2 className="text-3xl font-black mb-6">Create Your Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
            Username <span className="text-gray-600">(max 20 chars)</span>
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.slice(0, 20))}
            className="w-full p-4 rounded-xl bg-background border border-white/10 focus:border-primary outline-none transition-all"
            placeholder="e.g. Satoshi"
            maxLength={20}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
            Short Bio <span className="text-gray-600">(max 30 chars)</span>
          </label>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 30))}
            className="w-full p-4 rounded-xl bg-background border border-white/10 focus:border-primary outline-none transition-all"
            placeholder="e.g. DeFi Enthusiast"
            maxLength={30}
          />
        </div>
        <button
          onClick={handleRegister}
          disabled={isPending || isConfirming || !username || !bio}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-lg hover:shadow-[0_0_20px_rgba(255,0,122,0.4)] transition-all disabled:opacity-50"
        >
          {isPending ? "Confirming..." : isConfirming ? "Processing..." : "Join ForgeX"}
        </button>
      </div>
    </div>
  );
}
