import { orderService } from "@/lib/order-service";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

interface ClaimRequest {
  walletAddress: string;
}

interface RouteParams {
  params: Promise<{ shopifyOrderId: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { shopifyOrderId } = await params;
    const shopifyOrderIdNum = parseInt(shopifyOrderId);

    if (isNaN(shopifyOrderIdNum)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body: ClaimRequest = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Get order details to verify it's claimable
    const orderDetails = await orderService.getOrderDetails(shopifyOrderIdNum);

    if (!orderDetails) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify the order is fulfilled and belongs to the user
    if (orderDetails.order_status !== "fulfilled") {
      return NextResponse.json(
        { error: "Order is not fulfilled" },
        { status: 400 }
      );
    }

    // Check if the user is the purchaser
    if (
      orderDetails.purchaser_wallet_address?.toLowerCase() !==
      walletAddress.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "You are not authorized to claim this order" },
        { status: 403 }
      );
    }

    // Check if already claimed (using a claimed_at field in shopify_orders)
    if (orderDetails.claimed_at) {
      return NextResponse.json(
        { error: "Order has already been claimed" },
        { status: 400 }
      );
    }

    // Mark order as claimed by updating the shopify_orders record
    const { error: updateError } = await supabase
      .from("shopify_orders")
      .update({
        claimed_at: new Date().toISOString(),
        claim_amount: orderDetails.total_price,
      })
      .eq("shopify_order_id", shopifyOrderIdNum);

    if (updateError) {
      console.error("Error marking order as claimed:", updateError);
      return NextResponse.json(
        { error: "Failed to claim order" },
        { status: 500 }
      );
    }

    // Here you would typically integrate with a smart contract
    // to process the actual claim/reward distribution
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
      message: "Order claimed successfully",
      claim: {
        order_id: shopifyOrderIdNum,
        amount: orderDetails.total_price,
        currency: orderDetails.currency || "USD",
        status: "completed",
        claimed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error processing claim request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
