import { orderService } from "@/lib/order-service";
import { supabase } from "@/lib/supabase";
import {
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
    const fulfillmentData = JSON.parse(payload);

    // Log webhook event
    await logWebhookEvent("orders/fulfilled", headers!, fulfillmentData);

    console.log(
      "Processing order fulfilled webhook - Fulfillment ID:",
      fulfillmentData.id,
      "Order ID:",
      fulfillmentData.order_id
    );

    // Debug: Log the webhook topic to make sure we're getting the right webhook
    console.log("Webhook topic received:", headers!["x-shopify-topic"]);
    console.log("Fulfillment data keys:", Object.keys(fulfillmentData));

    // Use the order_id from the fulfillment payload, not the fulfillment id
    const actualOrderId = fulfillmentData.order_id;

    if (!actualOrderId) {
      console.error("No order_id found in fulfillment payload");
      return NextResponse.json({
        success: false,
        message: "No order_id in payload",
      });
    }

    console.log("Looking for order with ID:", actualOrderId);

    // Find order by the actual Shopify order ID from the payload
    const { data: existingOrder } = await supabase
      .from("shopify_orders")
      .select("shopify_order_id, listing_id, purchaser_wallet_address")
      .eq("shopify_order_id", actualOrderId)
      .maybeSingle();

    if (!existingOrder) {
      console.warn(
        `Order ${actualOrderId} not found in our system for fulfillment webhook`
      );
      return NextResponse.json({
        success: true,
        message: "Order not in our system, skipped",
      });
    }

    console.log(`Found order in system: ${actualOrderId}`);

    // Update order status to fulfilled
    const result = await orderService.updateOrderStatus(
      actualOrderId,
      "fulfilled",
      undefined, // No financial_status in fulfillment payload
      "fulfilled"
    );

    if (!result.success) {
      console.error("Failed to update order status:", result.error);
      await logWebhookEvent(
        "orders/fulfilled",
        headers!,
        fulfillmentData,
        false,
        result.error
      );
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 }
      );
    }

    // Add webhook event to order record (non-critical)
    try {
      await orderService.addWebhookEvent(actualOrderId, {
        topic: "orders/fulfilled",
        event_id: headers!["x-shopify-event-id"],
        timestamp: new Date().toISOString(),
        processed: true,
      });
    } catch (error) {
      console.warn(
        `Failed to add webhook event for order ${actualOrderId}:`,
        error
      );
    }

    // Mark event as processed
    await markEventProcessed(headers!["x-shopify-event-id"]);

    console.log("Successfully processed order fulfilled webhook:", {
      fulfillmentId: fulfillmentData.id,
      actualOrderId: actualOrderId,
      trackingNumber: fulfillmentData.tracking_number,
      trackingCompany: fulfillmentData.tracking_company,
    });

    return NextResponse.json({
      success: true,
      message: "Order fulfillment status updated successfully",
    });
  } catch (error) {
    console.error("Error processing order fulfilled webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
