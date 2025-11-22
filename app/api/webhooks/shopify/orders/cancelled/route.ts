import { orderService } from "@/lib/order-service";
import { OrderCancelledPayload } from "@/lib/types/shopify-webhooks";
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
    const orderData: OrderCancelledPayload = JSON.parse(payload);

    // Log webhook event
    await logWebhookEvent("orders/cancelled", headers!, orderData);

    console.log(
      "Processing order cancelled webhook for order ID:",
      orderData.id
    );

    // Update order status to cancelled
    const result = await orderService.updateOrderStatus(
      orderData.id,
      "cancelled",
      orderData.financial_status,
      orderData.fulfillment_status || "cancelled"
    );

    if (!result.success) {
      console.error("Failed to update order status:", result.error);
      await logWebhookEvent(
        "orders/cancelled",
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

    // Add webhook event to order record
    await orderService.addWebhookEvent(orderData.id, {
      topic: "orders/cancelled",
      event_id: headers!["x-shopify-event-id"],
      timestamp: new Date().toISOString(),
      processed: true,
    });

    // Mark event as processed
    await markEventProcessed(headers!["x-shopify-event-id"]);

    console.log("Successfully processed order cancelled webhook:", {
      shopifyOrderId: orderData.id,
      cancelReason: orderData.note,
    });

    return NextResponse.json({
      success: true,
      message: "Order cancellation processed successfully",
    });
  } catch (error) {
    console.error("Error processing order cancelled webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
