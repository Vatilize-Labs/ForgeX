"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { USER_VAULT_ABI, ERC20_ABI } from "@/lib/abis";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export function useVaultData(vaultAddress: `0x${string}`) {
  const { address } = useAccount();

  const totalAssets = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: "totalAssets",
    query: { enabled: !!vaultAddress },
  });

  const totalAssetsAccrued = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: "totalAssetsAccrued",
    query: { enabled: !!vaultAddress },
  });

  const totalSupply = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: "totalSupply",
    query: { enabled: !!vaultAddress },
  });

  const asset = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: "asset",
    query: { enabled: !!vaultAddress },
  });

  const isPaused = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: "isPaused",
    query: { enabled: !!vaultAddress },
  });

  const userShares = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: "balanceOf",
    args: [address ?? ZERO_ADDRESS],
    query: { enabled: !!vaultAddress && !!address },
  });

  const aaveBalance = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: "getAaveBalance",
    query: { enabled: !!vaultAddress },
  });

  const compoundBalance = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: "getCompoundBalance",
    query: { enabled: !!vaultAddress },
  });

  const totalValueUSD = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: "getTotalValueUSD",
    query: { enabled: !!vaultAddress },
  });

  const sharePriceUSD = useReadContract({
    address: vaultAddress,
    abi: USER_VAULT_ABI,
    functionName: "getSharePriceUSD",
    query: { enabled: !!vaultAddress },
  });

  return {
    totalAssets: totalAssets.data,
    totalAssetsAccrued: totalAssetsAccrued.data,
    totalSupply: totalSupply.data,
    assetAddress: asset.data,
    isPaused: isPaused.data,
    userShares: userShares.data,
    aaveBalance: aaveBalance.data,
    compoundBalance: compoundBalance.data,
    totalValueUSD: totalValueUSD.data,
    sharePriceUSD: sharePriceUSD.data,
    refetch: () => {
      totalAssets.refetch();
      totalAssetsAccrued.refetch();
      totalSupply.refetch();
      userShares.refetch();
      aaveBalance.refetch();
      compoundBalance.refetch();
      totalValueUSD.refetch();
      sharePriceUSD.refetch();
    },
  };
}

export function useVaultDeposit(vaultAddress: `0x${string}`) {
  const { address } = useAccount();

  const { writeContract: writeApprove, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: writeDeposit, data: depositHash, isPending: isDepositing, error } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: depositConfirmed } = useWaitForTransactionReceipt({ hash: depositHash });

  const approve = (assetAddress: `0x${string}`, amount: bigint) => {
    writeApprove({
      address: assetAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [vaultAddress, amount],
    });
  };

  const deposit = (amount: bigint) => {
    if (!address) return;
    writeDeposit({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: "deposit",
      args: [amount, address],
    });
  };

  return {
    approve,
    deposit,
    isApproving: isApproving || isApproveConfirming,
    approveConfirmed,
    isDepositing: isDepositing || isDepositConfirming,
    depositConfirmed,
    error,
  };
}

export function useVaultWithdraw(vaultAddress: `0x${string}`) {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = (amount: bigint) => {
    if (!address) return;
    writeContract({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: "withdraw",
      args: [amount, address, address],
    });
  };

  return { withdraw, isPending: isPending || isConfirming, isSuccess, error };
}

export function useDeployToAave(vaultAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deploy = (amount: bigint) => {
    writeContract({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: "deployToAave",
      args: [amount],
    });
  };

  return { deploy, isPending: isPending || isConfirming, isSuccess, error };
}

export function useDeployToCompound(vaultAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deploy = (amount: bigint) => {
    writeContract({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: "deployToCompound",
      args: [amount],
    });
  };

  return { deploy, isPending: isPending || isConfirming, isSuccess, error };
}

export function useWithdrawFromAave(vaultAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = (amount: bigint) => {
    writeContract({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: "withdrawFromAave",
      args: [amount],
    });
  };

  return { withdraw, isPending: isPending || isConfirming, isSuccess, error };
}

export function useWithdrawFromCompound(vaultAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = (amount: bigint) => {
    writeContract({
      address: vaultAddress,
      abi: USER_VAULT_ABI,
      functionName: "withdrawFromCompound",
      args: [amount],
    });
  };

  return { withdraw, isPending: isPending || isConfirming, isSuccess, error };
}

const TRANSFER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to",     type: "address"  },
      { internalType: "uint256", name: "amount", type: "uint256"  },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function useTransferShares(vaultAddress: `0x${string}`) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const transfer = (to: `0x${string}`, amount: bigint) => {
    writeContract({
      address: vaultAddress,
      abi: TRANSFER_ABI,
      functionName: "transfer",
      args: [to, amount],
    });
  };

  return { transfer, isPending: isPending || isConfirming, isSuccess, error };
}
