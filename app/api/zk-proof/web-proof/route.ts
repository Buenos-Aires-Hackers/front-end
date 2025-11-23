import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes for ZK proof generation
// ZK Proof API configuration - server-side only
const ZK_PROOF_CONFIG = {
  webProverUrl: "https://web-prover.vlayer.xyz/api/v1/prove",
  clientId: "387af48b-f956-4fa6-8e99-382fefe88dd9",
  authToken: "3R8Y3aLZIGTkIR4ZehRhyF4IcF2ENGkINxB3SJbDVwPB39AAMzU4ifzneao8yI93",
  shopifyStore:
    "https://test-1111111111111111111111111111111111711111111111125595.myshopify.com",
  // Timeout and retry configuration
  timeoutMs: 60000, // 30sec timeout
  retryAttempts: 2,
  retryDelayMs: 5000, // 5 seconds between retries
};

interface FetchRetryConfig {
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: FetchRetryConfig
) {
  for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
    const attemptLabel = `attempt ${attempt + 1}/${config.retryAttempts + 1}`;

    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(config.timeoutMs),
      });
      return response;
    } catch (error) {
      const isLastAttempt = attempt === config.retryAttempts;

      console.warn(
        `⚠️ Fetch to ${url} failed on ${attemptLabel}`,
        error instanceof Error ? error.message : error
      );

      if (isLastAttempt) {
        throw error;
      }

      if (config.retryDelayMs > 0) {
        await delay(config.retryDelayMs);
      }
    }
  }

  throw new Error("fetchWithRetry: exhausted retries");
}

export interface WebProofRequest {
  orderId: string;
  walletAddress?: string;
}

export interface WebProofResponse {
  data: string;
  version: string;
  meta: {
    notaryUrl: string;
  };
}

/**
 * API Route: Generate Web Proof
 * POST /api/zk-proof/web-proof
 *
 * Generates web proof data from Shopify order using vlayer web-prover API
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WebProofRequest;
    const { orderId, walletAddress } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    console.log("🌐 Generating web proof for order:", orderId);

    // Construct the Shopify API URL for the specific order
    const shopifyOrderUrl = `${ZK_PROOF_CONFIG.shopifyStore}/admin/api/2024-01/orders/${orderId}.json`;

    // Prepare the payload for the vlayer web-prover API
    const payload = {
      url: shopifyOrderUrl,
      headers: [`X-Shopify-Access-Token: ${process.env.SHOPIFY_ADMIN_API}`], // Shopify API headers for authentication (array format required by vlayer)
      // Optional metadata
      ...(walletAddress && {
        metadata: {
          walletAddress,
          timestamp: new Date().toISOString(),
        },
      }),
    };

    console.log("📋 Web proof request payload:", payload);

    // Make the API call to vlayer web-prover
    const response = await fetchWithRetry(
      ZK_PROOF_CONFIG.webProverUrl,
      {
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "x-client-id": ZK_PROOF_CONFIG.clientId,
          Authorization: `Bearer ${ZK_PROOF_CONFIG.authToken}`,
        },
        body: JSON.stringify(payload),
      },
      ZK_PROOF_CONFIG
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Web proof generation failed:", errorData);

      return NextResponse.json(
        {
          error:
            errorData.message ||
            errorData.error ||
            `Web proof generation failed: HTTP ${response.status}`,
          details: errorData,
        },
        { status: response.status }
      );
    }

    const webProofData: WebProofResponse = await response.json();
    console.log("✅ Web proof generated successfully");

    return NextResponse.json({
      success: true,
      data: webProofData,
      orderId,
      walletAddress,
    });
  } catch (error) {
    console.error("❌ Web proof API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate web proof",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
