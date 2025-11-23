"use client";

import { useState } from "react";

// Client-side API endpoints (using our internal API routes)
const ZK_PROOF_CONFIG = {
  webProofEndpoint: "/api/zk-proof/web-proof",
  compressionEndpoint: "/api/zk-proof/compress",
};

export interface WebProofData {
  data: string;
  version: string;
  meta: {
    notaryUrl: string;
  };
}

export interface ZkProofResponse {
  zkProof?: string;
  journalDataAbi?: string;
  webProofData?: WebProofData;
  success: boolean;
  error?: string;
}

export interface ZkProofRequest {
  orderId: string;
  walletAddress?: string;
  extractionFields?: string[]; // Fields to extract from Shopify order data
}

export interface ExtractionConfig {
  "response.body": {
    jmespath: string[];
  };
}

/**
 * Hook for generating ZK proofs for Shopify orders
 * This creates cryptographic proofs that verify order data without exposing sensitive information
 */
export function useZkProof() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Step 1: Generate web proof data from Shopify order
   * @param request - The proof generation request
   * @returns Promise<WebProofData> - Raw web proof data
   */
  const generateWebProof = async (
    request: ZkProofRequest
  ): Promise<WebProofData> => {
    console.log("🌐 Step 1: Generating web proof for order:", request.orderId);

    const payload = {
      orderId: request.orderId,
      walletAddress: request.walletAddress,
    };

    console.log("📋 Web proof request payload:", payload);

    // Call our internal API endpoint
    const response = await fetch(ZK_PROOF_CONFIG.webProofEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `Web proof generation failed: HTTP ${response.status}`
      );
    }

    const result = await response.json();
    console.log("✅ Web proof generated:", result);

    return result.data;
  };

  /**
   * Step 2: Compress web proof into ZK proof
   * @param webProofData - The web proof data from step 1
   * @param extractionFields - Fields to extract from the order data
   * @returns Promise<{zkProof: string, journalDataAbi: string}> - Compressed ZK proof
   */
  const compressWebProof = async (
    webProofData: WebProofData,
    extractionFields: string[] = [
      "id",
      "total_price",
      "customer",
      "fulfillment_status",
    ]
  ) => {
    console.log("🔐 Step 2: Compressing web proof into ZK proof");

    const payload = {
      webProofData,
      extractionFields,
    };

    console.log("📋 Compression request payload:", {
      ...payload,
      webProofData: {
        ...payload.webProofData,
        data: `${payload.webProofData.data.slice(0, 20)}...`,
      },
    });

    // Call our internal API endpoint
    const response = await fetch(ZK_PROOF_CONFIG.compressionEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webProofData,
        extractionFields,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `ZK proof compression failed: HTTP ${response.status}`
      );
    }

    const result = await response.json();
    console.log("✅ ZK proof compressed:", result);

    if (!result.success) {
      throw new Error("Compression failed: " + result.error);
    }

    return {
      zkProof: result.zkProof,
      journalDataAbi: result.journalDataAbi,
    };
  };

  /**
   * Generate a complete ZK proof for a specific Shopify order (two-step process)
   * @param request - The proof generation request containing order ID and optional wallet address
   * @returns Promise<ZkProofResponse> - The generated proof and verification data
   */
  const generateProof = async (
    request: ZkProofRequest
  ): Promise<ZkProofResponse> => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log(
        "🔐 Starting ZK proof generation for order:",
        request.orderId
      );

      // Step 1: Generate web proof
      const webProofData = await generateWebProof(request);

      // Step 2: Compress into ZK proof
      const zkProofData = await compressWebProof(
        webProofData,
        request.extractionFields
      );

      console.log("✅ Complete ZK proof generation successful!");

      return {
        zkProof: zkProofData.zkProof,
        journalDataAbi: zkProofData.journalDataAbi,
        webProofData,
        success: true,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate ZK proof";
      console.error("❌ ZK proof generation error:", err);
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate ZK proof for order verification
   * Specifically for proving order ownership/fulfillment without revealing sensitive data
   */
  const generateOrderProof = async (
    orderId: string,
    walletAddress: string
  ): Promise<ZkProofResponse> => {
    return generateProof({ orderId, walletAddress });
  };

  /**
   * Batch generate proofs for multiple orders
   * Useful for bulk verification scenarios
   */
  const generateBatchProofs = async (
    requests: ZkProofRequest[]
  ): Promise<ZkProofResponse[]> => {
    console.log("🔄 Generating batch ZK proofs for", requests.length, "orders");

    const results = await Promise.allSettled(
      requests.map((request) => generateProof(request))
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        console.error(`❌ Batch proof ${index} failed:`, result.reason);
        return {
          success: false,
          error: result.reason?.message || "Batch proof generation failed",
        };
      }
    });
  };

  /**
   * Clear any existing error state
   */
  const clearError = () => {
    setError(null);
  };

  return {
    // State
    isGenerating,
    error,

    // Actions
    generateProof,
    generateWebProof,
    compressWebProof,
    generateOrderProof,
    generateBatchProofs,
    clearError,

    // Config (for debugging/display)
    config: ZK_PROOF_CONFIG,
  };
}

/**
 * Utility function to verify a ZK proof
 * This would typically be used on-chain or with a verification service
 */
export function verifyZkProof(
  proof: string,
  publicInputs: any,
  verificationKey: string
): boolean {
  // TODO: Implement actual proof verification logic
  // This would depend on the specific ZK proving system being used
  console.log("🔍 Verifying ZK proof...", {
    proof,
    publicInputs,
    verificationKey,
  });

  // For now, return a basic validation
  return !!(proof && publicInputs && verificationKey);
}
