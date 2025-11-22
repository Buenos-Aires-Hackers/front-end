import { orderService } from "@/lib/order-service";
import { supabase } from "@/lib/supabase";
import { OrderCreatedPayload } from "@/lib/types/shopify-webhooks";
import {
  extractListingIdFromOrder,
  extractPurchaserFromOrder,
  getCreatorFromListing,
  logWebhookEvent,
  markEventProcessed,
  validateWebhookRequest,
} from "@/lib/webhook-utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();

    // Validate webhook request
    const validation = await validateWebhookRequest(request, payload);
    if (!validation.valid) {
      console.error("Webhook validation failed:", validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { headers } = validation;
    const orderData: OrderCreatedPayload = JSON.parse(payload);

    // Log webhook event
    await logWebhookEvent("orders/create", headers!, orderData);

    console.log("Processing order created webhook for order ID:", orderData.id);

    // Extract listing information from the order
    const listingId = extractListingIdFromOrder(orderData);
    if (!listingId) {
      console.error("Could not extract listing ID from order:", orderData.id);
      await logWebhookEvent(
        "orders/create",
        headers!,
        orderData,
        false,
        "Could not extract listing ID"
      );
      return NextResponse.json(
        { error: "Could not identify marketplace listing" },
        { status: 400 }
      );
    }

    // Get creator wallet address from listing
    const creatorWalletAddress = await getCreatorFromListing(listingId);
    if (!creatorWalletAddress) {
      console.error("Could not find creator for listing:", listingId);
      await logWebhookEvent(
        "orders/create",
        headers!,
        orderData,
        false,
        "Could not find creator"
      );
      return NextResponse.json(
        { error: "Could not identify listing creator" },
        { status: 400 }
      );
    }

    // Extract purchaser wallet address
    const purchaserWalletAddress = extractPurchaserFromOrder(orderData);
    if (!purchaserWalletAddress) {
      console.error(
        "Could not extract purchaser wallet from order:",
        orderData.id
      );
      await logWebhookEvent(
        "orders/create",
        headers!,
        orderData,
        false,
        "Could not extract purchaser wallet"
      );
      return NextResponse.json(
        { error: "Could not identify purchaser" },
        { status: 400 }
      );
    }

    // Determine order status based on financial status
    let orderStatus:
      | "pending"
      | "paid"
      | "fulfilled"
      | "cancelled"
      | "refunded" = "pending";
    if (orderData.financial_status === "paid") {
      orderStatus = "paid";
    }

    // Update listing with Shopify product ID for future reference
    const productId = orderData.line_items?.[0]?.product_id;
    if (productId) {
      const { error: updateError } = await supabase
        .from("listings")
        .update({
          shopify_product_id: productId.toString(),
          last_order_at: new Date().toISOString(),
        })
        .eq("id", listingId);

      if (updateError) {
        console.error("Error updating listing with product ID:", updateError);
      }
    }

    // Create order record
    const orderRecord = {
      shopify_order_id: orderData.id,
      shopify_checkout_id: orderData.checkout_id?.toString(),
      listing_id: listingId, // Keep as string to match ShopifyOrderRecord type
      purchaser_wallet_address: purchaserWalletAddress,
      creator_wallet_address: creatorWalletAddress,
      order_status: orderStatus as
        | "pending"
        | "paid"
        | "fulfilled"
        | "cancelled"
        | "refunded",
      financial_status: orderData.financial_status,
      fulfillment_status: orderData.fulfillment_status || "unfulfilled",
      total_price: parseFloat(orderData.total_price),
      currency: orderData.currency,
      shopify_customer_id: orderData.customer?.id,
      shopify_customer_email: orderData.email,
      shipping_address: orderData.shipping_address,
      line_items: orderData.line_items,
      webhook_events: [
        {
          topic: "orders/create",
          event_id: headers!["x-shopify-event-id"],
          timestamp: new Date().toISOString(),
          processed: true,
        },
      ],
    };

    // Save order to database
    const result = await orderService.upsertOrder(orderRecord);

    if (!result.success) {
      console.error("Failed to save order:", result.error);
      await logWebhookEvent(
        "orders/create",
        headers!,
        orderData,
        false,
        result.error
      );
      return NextResponse.json(
        { error: "Failed to save order" },
        { status: 500 }
      );
    }

    // Mark event as processed
    await markEventProcessed(headers!["x-shopify-event-id"]);

    console.log("Successfully processed order created webhook:", {
      shopifyOrderId: orderData.id,
      orderId: result.orderId,
      listingId,
      creatorWallet: creatorWalletAddress,
      purchaserWallet: purchaserWalletAddress,
      totalPrice: orderData.total_price,
    });

    return NextResponse.json({
      success: true,
      message: "Order created successfully",
      orderId: result.orderId,
    });
  } catch (error) {
    console.error("Error processing order created webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
