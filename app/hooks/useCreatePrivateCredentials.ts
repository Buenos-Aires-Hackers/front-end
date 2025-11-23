"use client";

import { depositContract } from "@/app/contract/contract";
import { useCallback, useState } from "react";
import type { Address, Hex } from "viem";
import { usePublicClient } from "wagmi";

import { resolveTreasuryContractAddress } from "./treasuryContract";

export interface PrivateCredentialsInput {
  fullName: string;
  emailAddress: string;
  homeAddress: string;
  city: string;
  country: string;
  zip: string;
}

interface UseCreatePrivateCredentialsOptions {
  contractAddress?: Address;
  chainId?: number;
}

export const useCreatePrivateCredentials = (
  options: UseCreatePrivateCredentialsOptions = {}
) => {
  const [data, setData] = useState<Hex | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { contractAddress: overrideAddress, chainId } = options;
  const contractAddress = resolveTreasuryContractAddress(overrideAddress);

  const publicClient = usePublicClient({ chainId });

  const createPrivateCredentials = useCallback(
    async (input: PrivateCredentialsInput): Promise<Hex> => {
      if (!contractAddress) {
        throw new Error(
          "Treasury contract address is not set. Pass it to useCreatePrivateCredentials or configure NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS."
        );
      }

      if (!publicClient) {
        throw new Error("Public client is not ready yet.");
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = (await publicClient.readContract({
          abi: depositContract,
          address: contractAddress,
          functionName: "createPrivateCredentials",
          args: [
            {
              fullName: input.fullName,
              emailAddress: input.emailAddress,
              homeAddress: input.homeAddress,
              city: input.city,
              country: input.country,
              zip: input.zip,
            },
          ],
        })) as Hex;

        setData(result);
        return result;
      } catch (unknownError) {
        const newError =
          unknownError instanceof Error
            ? unknownError
            : new Error("Failed to create private credentials.");
        console.error("[useCreatePrivateCredentials] Failed", unknownError, {
          input,
          contractAddress,
          chainId,
        });
        setError(newError);
        throw newError;
      } finally {
        setIsLoading(false);
      }
    },
    [chainId, contractAddress, publicClient]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    createPrivateCredentials,
    data,
    isLoading,
    error,
    reset,
  };
};
