import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Testing webhook setup and database...");

    // Test database connection
    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select(
        "id, title, status, shopify_product_id, purchased_at, purchaser_email"
      )
      .limit(5);

    if (listingsError) {
      throw new Error(`Listings query failed: ${listingsError.message}`);
    }

    // Test shopify_orders table
    const { data: orders, error: ordersError } = await supabase
      .from("shopify_orders")
      .select("*")
      .limit(5);

    if (ordersError) {
      console.log(
        "shopify_orders table might not exist yet:",
        ordersError.message
      );
    }

    // Check webhook endpoints
    const webhookEndpoints = [
      "/api/webhooks/orders/paid",
      "/api/webhooks/orders/fulfilled",
      "/api/webhooks/orders/cancelled",
    ];

    const appUrl = process.env.APP_URL || "http://localhost:3000";

    return NextResponse.json({
      message: "Webhook setup test completed",
      database: {
        listings: {
          count: listings?.length || 0,
          sample: listings?.slice(0, 3),
          hasStatusColumn: listings?.[0]?.hasOwnProperty("status") || false,
        },
        orders: {
          count: orders?.length || 0,
          tableExists: !ordersError,
        },
      },
      webhooks: {
        endpoints: webhookEndpoints.map((endpoint) => `${appUrl}${endpoint}`),
        secretConfigured: !!process.env.SHOPIFY_WEBHOOK_SECRET,
        appUrlConfigured: !!process.env.APP_URL,
      },
      shopifyConfig: {
        storeConfigured: !!process.env.NEXT_PUBLIC_SHOPIFY_STORE_NAME,
        accessTokenConfigured:
          !!process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        webhookSecretConfigured: !!process.env.SHOPIFY_WEBHOOK_SECRET,
      },
      nextSteps: [
        "Run database migration to add purchase tracking columns",
        "Configure webhooks in Shopify Partner Dashboard",
        "Set SHOPIFY_WEBHOOK_SECRET in environment variables",
        "Test webhook delivery using Shopify webhook testing tools",
      ],
    });
  } catch (error) {
    console.error("Webhook setup test failed:", error);
    return NextResponse.json(
      {
        error: "Setup test failed",
        message: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Check database connection and environment variables",
      },
      { status: 500 }
    );
  }
}

// Test webhook endpoint (for Shopify webhook verification)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-shopify-hmac-sha256");
    const topic = request.headers.get("x-shopify-topic");

    console.log("Webhook test received:", {
      topic,
      hasSignature: !!signature,
      bodyLength: body.length,
      timestamp: new Date().toISOString(),
    });

    // This is just a test endpoint - real webhook processing is in specific routes
    return NextResponse.json({
      message: "Webhook test endpoint received data",
      topic,
      received: new Date().toISOString(),
      note: "This is the test endpoint. Real webhooks should be sent to /api/webhooks/orders/* endpoints",
    });
  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json({ error: "Webhook test failed" }, { status: 500 });
  }
}
