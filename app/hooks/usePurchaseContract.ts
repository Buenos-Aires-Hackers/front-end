"use client";

import { depositContract } from "@/app/contract/contract";
import { useCallback } from "react";
import type { Address, Hash, Hex, TransactionReceipt } from "viem";
import { readContract } from "viem/actions";
import {
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { resolveTreasuryContractAddress } from "./treasuryContract";

export { DEFAULT_TREASURY_CONTRACT_ADDRESS } from "./treasuryContract";

// Listing structure matching the contract
export interface Listing {
  url: string;
  productId: string;
  amount: bigint;
  shopper: Address;
  privateCredentials: Hex;
}

// Submit purchase arguments
export interface SubmitPurchaseArgs {
  id: Hex; // bytes32 listing ID
  purchaseData: Hex; // ZK proof data
  seal: Hex; // ZK proof seal/signature
}

interface UseContractOptions {
  contractAddress?: Address;
  chainId?: number;
}

/**
 * Hook for calculating listing ID from listing data
 * This is a read-only function that computes the unique ID for a listing
 */
export const useCalculateId = (
  listing: Listing | null,
  options: UseContractOptions = {}
) => {
  const { chainId, contractAddress: overrideAddress } = options;
  const contractAddress = resolveTreasuryContractAddress(overrideAddress);
  const publicClient = usePublicClient({ chainId });

  const {
    data: listingId,
    error,
    isLoading,
    refetch,
  } = useReadContract({
    abi: depositContract,
    address: contractAddress,
    functionName: "calculateId",
    args: listing ? [listing] : undefined,
    chainId,
    query: {
      enabled: Boolean(listing && contractAddress),
    },
  });

  const calculateId = useCallback(
    async (newListing: Listing) => {
      if (!contractAddress) {
        throw new Error("Contract address is not available");
      }

      if (!publicClient) {
        throw new Error("Public client is not available");
      }

      try {
        console.log("🔍 Calculating listing ID for:", newListing);
        console.log("📋 Contract address:", contractAddress);

        // Use readContract directly for dynamic one-off calls
        const result = await readContract(publicClient, {
          abi: depositContract,
          address: contractAddress,
          functionName: "calculateId",
          //@ts-expect-error some abi error
          args: [newListing] as const,
        });

        console.log("✅ Listing ID calculated:", result);
        return { data: result as Hex, success: true };
      } catch (err) {
        console.error("❌ calculateId error:", err);
        throw err;
      }
    },
    [contractAddress, chainId, publicClient]
  );

  return {
    listingId: listingId as Hex | undefined,
    isLoading,
    error: error as Error | null,
    calculateId,
    refetch,
  };
};

/**
 * Hook for submitting purchase with ZK proof
 * This writes to the contract to finalize a purchase with cryptographic proof
 */
export const useSubmitPurchase = (
  options: UseContractOptions = {}
): {
  submitPurchase: (args: SubmitPurchaseArgs) => Promise<Hash>;
  hash?: Hash;
  receipt?: TransactionReceipt;
  isWriting: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error: Error | null;
  waitForReceipt: (hash?: Hash) => Promise<TransactionReceipt>;
  reset: () => void;
} => {
  const { chainId, contractAddress: overrideAddress } = options;
  const contractAddress = resolveTreasuryContractAddress(overrideAddress);
  const publicClient = usePublicClient({ chainId });

  const {
    data: hash,
    error: writeError,
    isPending: isWriting,
    reset: resetWriteState,
    writeContractAsync,
  } = useWriteContract();

  const {
    data: receipt,
    error: waitError,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: Boolean(hash),
    },
  });

  const submitPurchase = useCallback(
    async (args: SubmitPurchaseArgs) => {
      if (!contractAddress) {
        throw new Error(
          "Treasury contract address is not set. Pass it to useSubmitPurchase or configure NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS."
        );
      }

      try {
        console.log("[useSubmitPurchase] Writing submitPurchase()", {
          args,
          contractAddress,
          chainId,
        });

        return await writeContractAsync({
          abi: depositContract,
          address: contractAddress,
          functionName: "submitPurchase",
          args: [args.id, args.purchaseData, args.seal],
          chainId,
        });
      } catch (unknownError) {
        console.error(
          "[useSubmitPurchase] submitPurchase() failed",
          unknownError,
          {
            args,
            contractAddress,
            chainId,
          }
        );
        throw unknownError;
      }
    },
    [chainId, contractAddress, writeContractAsync]
  );

  const waitForReceipt = useCallback(
    async (hashOverride?: Hash): Promise<TransactionReceipt> => {
      if (!publicClient) {
        throw new Error("Public client is not ready.");
      }

      const targetHash = hashOverride ?? hash;

      if (!targetHash) {
        throw new Error("No transaction hash available to wait for.");
      }

      return await publicClient.waitForTransactionReceipt({
        hash: targetHash,
      });
    },
    [hash, publicClient]
  );

  const reset = useCallback(() => {
    resetWriteState();
  }, [resetWriteState]);

  return {
    submitPurchase,
    hash,
    receipt,
    isWriting,
    isConfirming,
    isConfirmed,
    error: (writeError as Error | null) ?? (waitError as Error | null) ?? null,
    waitForReceipt,
    reset,
  };
};

/**
 * Combined hook for the complete purchase flow with ZK proofs
 * This combines listing ID calculation with ZK proof generation and purchase submission
 */
export const usePurchaseWithZkProof = (options: UseContractOptions = {}) => {
  const calculateIdHook = useCalculateId(null, options);
  const submitPurchaseHook = useSubmitPurchase(options);

  const executePurchaseFlow = useCallback(
    async (listing: Listing, zkProof: string, seal: Hex) => {
      try {
        console.log("🔄 Starting purchase flow with ZK proof...");

        // Step 1: Calculate listing ID
        console.log("📝 Step 1: Calculating listing ID");
        const idResult = await calculateIdHook.calculateId(listing);
        const listingId = idResult.data as Hex;

        if (!listingId) {
          throw new Error("Failed to calculate listing ID");
        }

        console.log("✅ Listing ID calculated:", listingId);

        // Step 2: Submit purchase with ZK proof
        console.log("🔐 Step 2: Submitting purchase with ZK proof");
        const purchaseHash = await submitPurchaseHook.submitPurchase({
          id: listingId,
          purchaseData: zkProof as Hex,
          seal,
        });

        console.log("✅ Purchase submitted with hash:", purchaseHash);

        // Step 3: Wait for confirmation
        console.log("⏳ Step 3: Waiting for transaction confirmation");
        const receipt = await submitPurchaseHook.waitForReceipt(purchaseHash);

        console.log("🎉 Purchase flow completed successfully!", receipt);

        return {
          listingId,
          purchaseHash,
          receipt,
          success: true,
        };
      } catch (error) {
        console.error("❌ Purchase flow failed:", error);
        throw error;
      }
    },
    [calculateIdHook, submitPurchaseHook]
  );

  return {
    // Individual hook access
    calculateId: calculateIdHook,
    submitPurchase: submitPurchaseHook,

    // Combined flow
    executePurchaseFlow,

    // Combined state
    isProcessing:
      calculateIdHook.isLoading ||
      submitPurchaseHook.isWriting ||
      submitPurchaseHook.isConfirming,
    error: calculateIdHook.error ?? submitPurchaseHook.error,
  };
};

export type { UseContractOptions };
