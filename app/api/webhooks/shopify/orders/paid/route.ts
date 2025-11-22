import { orderService } from "@/lib/order-service";
import { OrderPaidPayload } from "@/lib/types/shopify-webhooks";
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
    const orderData: OrderPaidPayload = JSON.parse(payload);

    // Log webhook event
    await logWebhookEvent("orders/paid", headers!, orderData);

    console.log("Processing order paid webhook for order ID:", orderData.id);

    // Update order status to paid
    const result = await orderService.updateOrderStatus(
      orderData.id,
      "paid",
      orderData.financial_status,
      orderData.fulfillment_status || undefined
    );

    if (!result.success) {
      console.error("Failed to update order status:", result.error);
      await logWebhookEvent(
        "orders/paid",
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
      topic: "orders/paid",
      event_id: headers!["x-shopify-event-id"],
      timestamp: new Date().toISOString(),
      processed: true,
    });

    // Mark event as processed
    await markEventProcessed(headers!["x-shopify-event-id"]);

    console.log("Successfully processed order paid webhook:", {
      shopifyOrderId: orderData.id,
      financialStatus: orderData.financial_status,
    });

    return NextResponse.json({
      success: true,
      message: "Order payment status updated successfully",
    });
  } catch (error) {
    console.error("Error processing order paid webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
