"use client";

import { useCallback, useState } from "react";
import type { Address, Hex } from "viem";

import {
  usePurchaseWithZkProof,
  type Listing,
  type UseContractOptions,
} from "./usePurchaseContract";
import { useZkProof, type ZkProofResponse } from "./useZkProof";

export interface PurchaseFlowArgs {
  listing: Listing;
  orderId: string;
  walletAddress: Address;
  extractionFields?: string[];
}

export interface PurchaseFlowResult {
  listingId: Hex;
  purchaseHash: Hex;
  zkProof: ZkProofResponse;
  success: boolean;
}

/**
 * Comprehensive hook that orchestrates the complete purchase flow:
 * 1. Generate ZK proof for Shopify order data
 * 2. Calculate listing ID from listing data
 * 3. Submit purchase to contract with ZK proof
 *
 * This hook combines ZK proof generation with smart contract interactions
 * for a seamless, privacy-preserving purchase experience.
 */
export const useZkPurchaseFlow = (options: UseContractOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize hooks
  const zkProofHook = useZkProof();
  const contractHook = usePurchaseWithZkProof(options);

  /**
   * Execute the complete purchase flow with ZK proof verification
   */
  const executePurchaseFlow = useCallback(
    async (args: PurchaseFlowArgs): Promise<PurchaseFlowResult> => {
      setIsProcessing(true);
      setError(null);

      try {
        console.log("🚀 Starting ZK-powered purchase flow...");

        // Step 1: Generate ZK proof for order verification
        setCurrentStep("Generating ZK proof for order verification");
        console.log("🔐 Step 1: Generating ZK proof for order:", args.orderId);

        const zkProofResult = await zkProofHook.generateOrderProof(
          args.orderId,
          args.walletAddress
        );

        if (!zkProofResult.success || !zkProofResult.zkProof) {
          throw new Error(zkProofResult.error || "Failed to generate ZK proof");
        }

        console.log("✅ ZK proof generated successfully");

        // Step 2: Execute contract purchase flow
        setCurrentStep("Submitting purchase to blockchain");
        console.log("🔗 Step 2: Executing blockchain purchase flow");

        // Use the ZK proof as purchase data and journal data as seal
        const contractResult = await contractHook.executePurchaseFlow(
          args.listing,
          zkProofResult.zkProof,
          (zkProofResult.journalDataAbi as Hex) || "0x"
        );

        console.log("✅ Purchase flow completed successfully!");
        setCurrentStep("Purchase completed successfully");

        const result: PurchaseFlowResult = {
          listingId: contractResult.listingId,
          purchaseHash: contractResult.purchaseHash,
          zkProof: zkProofResult,
          success: true,
        };

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Purchase flow failed";
        console.error("❌ ZK purchase flow error:", err);
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsProcessing(false);
        setCurrentStep(null);
      }
    },
    [zkProofHook, contractHook]
  );

  /**
   * Generate ZK proof only (without contract interaction)
   * Useful for testing or preparing proofs in advance
   */
  const generateProofOnly = useCallback(
    async (
      orderId: string,
      walletAddress: Address,
      extractionFields?: string[]
    ) => {
      return zkProofHook.generateProof({
        orderId,
        walletAddress,
        extractionFields,
      });
    },
    [zkProofHook]
  );

  /**
   * Calculate listing ID for a given listing
   * Useful for UI display or validation
   */
  const calculateListingId = useCallback(
    (listing: Listing) => {
      return contractHook.calculateId.calculateId(listing);
    },
    [contractHook]
  );

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
    zkProofHook.clearError();
  }, [zkProofHook]);

  /**
   * Reset all hook states
   */
  const reset = useCallback(() => {
    setError(null);
    setCurrentStep(null);
    setIsProcessing(false);
    zkProofHook.clearError();
    contractHook.submitPurchase.reset();
  }, [zkProofHook, contractHook]);

  return {
    // Main flow
    executePurchaseFlow,

    // Individual operations
    generateProofOnly,
    calculateListingId,

    // State
    isProcessing:
      isProcessing || zkProofHook.isGenerating || contractHook.isProcessing,
    currentStep,
    error: error || zkProofHook.error || contractHook.error?.message || null,

    // Sub-hook access
    zkProof: zkProofHook,
    contract: contractHook,

    // Actions
    clearError,
    reset,
  };
};

/**
 * Utility function to create a listing from common parameters
 */
export const createListing = (
  url: string,
  productId: string,
  amount: bigint,
  shopper: Address,
  privateCredentials: Hex
): Listing => ({
  url,
  productId,
  amount,
  shopper,
  privateCredentials,
});

/**
 * Utility function to format ZK proof result for display
 */
export const formatZkProofResult = (result: ZkProofResponse) => {
  if (!result.success) {
    return {
      status: "Failed",
      error: result.error,
    };
  }

  return {
    status: "Success",
    proofLength: result.zkProof?.length || 0,
    hasJournalData: Boolean(result.journalDataAbi),
    webProofVersion: result.webProofData?.version,
  };
};
