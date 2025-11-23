import { orderService } from "@/lib/order-service";
import { supabase } from "@/lib/supabase";
import { OrderFulfilledPayload } from "@/lib/types/shopify-webhooks";
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
    const orderData: OrderFulfilledPayload = JSON.parse(payload);

    // Log webhook event
    await logWebhookEvent("orders/fulfilled", headers!, orderData);

    console.log(
      "Processing order fulfilled webhook for order ID:",
      orderData.id
    );

    // First, try to find the order in our system by order_id or checkout_id
    const { data: existingOrder } = await supabase
      .from("shopify_orders")
      .select("shopify_order_id, shopify_checkout_id")
      .or(
        `shopify_order_id.eq.${orderData.id},shopify_checkout_id.eq.${orderData.id}`
      )
      .maybeSingle();

    if (!existingOrder) {
      console.warn(
        `Order ${orderData.id} not found in our system, skipping fulfillment update`
      );
      return NextResponse.json({
        success: true,
        message: "Order not in our system, skipped",
      });
    }

    const actualOrderId = existingOrder.shopify_order_id;
    console.log(`Found order in system: ${actualOrderId}`);

    // Update order status to fulfilled
    const result = await orderService.updateOrderStatus(
      actualOrderId,
      "fulfilled",
      orderData.financial_status,
      orderData.fulfillment_status || "fulfilled"
    );

    if (!result.success) {
      console.error("Failed to update order status:", result.error);
      await logWebhookEvent(
        "orders/fulfilled",
        headers!,
        orderData,
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
      originalId: orderData.id,
      actualOrderId: actualOrderId,
      fulfillmentStatus: orderData.fulfillment_status,
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






