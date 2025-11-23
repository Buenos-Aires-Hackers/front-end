import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 90;
// ZK Proof API configuration - server-side only
const ZK_PROOF_CONFIG = {
  compressionUrl: "https://zk-prover.vlayer.xyz/api/v0/compress-web-proof",
  clientId: "387af48b-f956-4fa6-8e99-382fefe88dd9",
  authToken: "3R8Y3aLZIGTkIR4ZehRhyF4IcF2ENGkINxB3SJbDVwPB39AAMzU4ifzneao8yI93",
};

export interface WebProofData {
  data: string;
  version: string;
  meta: {
    notaryUrl: string;
  };
}

export interface CompressionRequest {
  webProofData: WebProofData;
  extractionFields?: string[];
}

export interface ExtractionConfig {
  "response.body": {
    jmespath: string[];
  };
}

export interface CompressionResponse {
  success: boolean;
  data: {
    zkProof: string;
    journalDataAbi: string;
  };
}

/**
 * API Route: Compress Web Proof to ZK Proof
 * POST /api/zk-proof/compress
 *
 * Compresses web proof data into ZK proof using vlayer compression API
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CompressionRequest;
    const { webProofData, extractionFields } = body;

    if (!webProofData || !webProofData.data) {
      return NextResponse.json(
        { error: "Web proof data is required" },
        { status: 400 }
      );
    }

    console.log("🔐 Compressing web proof to ZK proof");

    // Default extraction fields for Shopify orders
    const defaultFields = [
      "id",
      "total_price",
      "customer",
      "fulfillment_status",
    ];
    const fieldsToExtract = extractionFields || defaultFields;

    // Prepare extraction configuration
    const extraction: ExtractionConfig = {
      "response.body": {
        jmespath: fieldsToExtract,
      },
    };

    const payload = {
      presentation: webProofData,
      extraction,
    };

    console.log("📋 Compression request payload:", {
      ...payload,
      presentation: {
        ...payload.presentation,
        data: `${payload.presentation.data.slice(0, 20)}...`,
      },
    });

    // Make the API call to compress the web proof
    const response = await fetch(ZK_PROOF_CONFIG.compressionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": ZK_PROOF_CONFIG.clientId,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${ZK_PROOF_CONFIG.authToken}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(85000), // 85 seconds (less than maxDuration)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ ZK proof compression failed:", errorData);

      return NextResponse.json(
        {
          error:
            errorData.message ||
            errorData.error ||
            `ZK proof compression failed: HTTP ${response.status}`,
          details: errorData,
        },
        { status: response.status }
      );
    }

    const compressionResult: CompressionResponse = await response.json();
    console.log("✅ ZK proof compressed successfully");

    if (!compressionResult.success) {
      return NextResponse.json(
        {
          error: "Compression failed",
          details: compressionResult,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      zkProof: compressionResult.data.zkProof,
      journalDataAbi: compressionResult.data.journalDataAbi,
      extractionFields: fieldsToExtract,
    });
  } catch (error) {
    console.error("❌ ZK proof compression API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to compress ZK proof",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
