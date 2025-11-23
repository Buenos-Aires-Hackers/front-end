"use client";

import { depositContract } from "@/app/contract/contract";
import { useCallback } from "react";
import type { Address, Hash, Hex, TransactionReceipt } from "viem";
import {
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { resolveTreasuryContractAddress } from "./treasuryContract";

export { DEFAULT_TREASURY_CONTRACT_ADDRESS } from "./treasuryContract";

export interface ListListingArgs {
  url: string;
  amount: bigint;
  shopper: Address;
  privateCredentials: Hex;
}

interface UseListListingOptions {
  contractAddress?: Address;
  chainId?: number;
}

export const useListListing = (
  options: UseListListingOptions = {}
): {
  list: (listing: ListListingArgs) => Promise<Hash>;
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

  const list = useCallback(
    async (listing: ListListingArgs) => {
      if (!contractAddress) {
        throw new Error(
          "Treasury contract address is not set. Pass it to useListListing or configure NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS."
        );
      }

      try {
        console.log("[useListListing] Writing list()", {
          listing,
          contractAddress,
          chainId,
        });

        return await writeContractAsync({
          abi: depositContract,
          address: contractAddress,
          functionName: "list",
          args: [
            {
              url: listing.url,
              amount: listing.amount,
              shopper: listing.shopper,
              privateCredentials: listing.privateCredentials,
            },
          ],
          chainId,
        });
      } catch (unknownError) {
        console.error("[useListListing] list() failed", unknownError, {
          listing,
          contractAddress,
          chainId,
        });
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
    list,
    hash,
    receipt,
    isWriting,
    isConfirming,
    isConfirmed,
    error:
      (writeError as Error | null) ?? (waitError as Error | null) ?? null,
    waitForReceipt,
    reset,
  };
};
