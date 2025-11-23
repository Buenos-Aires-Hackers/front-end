import { orderService } from "@/lib/order-service";
import { FulfillmentCreatedPayload } from "@/lib/types/shopify-webhooks";
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
    const fulfillmentData: FulfillmentCreatedPayload = JSON.parse(payload);

    // Log webhook event
    await logWebhookEvent("fulfillments/create", headers!, fulfillmentData);

    console.log(
      "Processing fulfillment created webhook for order ID:",
      fulfillmentData.order_id
    );

    // Create fulfillment tracking record
    const trackingRecord = {
      shopify_order_id: fulfillmentData.order_id,
      shopify_fulfillment_id: fulfillmentData.id,
      tracking_company: fulfillmentData.tracking_company,
      tracking_number: fulfillmentData.tracking_number,
      tracking_url: fulfillmentData.tracking_url,
      shipment_status:
        fulfillmentData.shipment_status === "confirmed"
          ? ("in_transit" as const)
          : ("pending" as const),
      shipped_at: fulfillmentData.created_at,
      location_updates: [],
    };

    const result = await orderService.upsertFulfillmentTracking(trackingRecord);

    if (!result.success) {
      console.error("Failed to save fulfillment tracking:", result.error);
      await logWebhookEvent(
        "fulfillments/create",
        headers!,
        fulfillmentData,
        false,
        result.error
      );
      return NextResponse.json(
        { error: "Failed to save tracking info" },
        { status: 500 }
      );
    }

    // Update order status to fulfilled if appropriate
    if (fulfillmentData.status === "success") {
      const updateResult = await orderService.updateOrderStatus(
        fulfillmentData.order_id,
        "fulfilled",
        undefined,
        "fulfilled"
      );
      
      if (!updateResult.success) {
        console.warn(
          `Failed to update order status for ${fulfillmentData.order_id}: ${updateResult.error}`
        );
        // Continue processing - this is not a critical failure
      }
    }

    // Add webhook event to order record (non-critical)
    try {
      await orderService.addWebhookEvent(fulfillmentData.order_id, {
        topic: "fulfillments/create",
        event_id: headers!["x-shopify-event-id"],
        timestamp: new Date().toISOString(),
        processed: true,
      });
    } catch (error) {
      console.warn(
        `Failed to add webhook event for order ${fulfillmentData.order_id}:`,
        error
      );
      // Continue processing - this is not a critical failure
    }

    // Mark event as processed
    await markEventProcessed(headers!["x-shopify-event-id"]);

    console.log("Successfully processed fulfillment created webhook:", {
      shopifyOrderId: fulfillmentData.order_id,
      fulfillmentId: fulfillmentData.id,
      trackingNumber: fulfillmentData.tracking_number,
      trackingCompany: fulfillmentData.tracking_company,
    });

    return NextResponse.json({
      success: true,
      message: "Fulfillment tracking created successfully",
    });
  } catch (error) {
    console.error("Error processing fulfillment created webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
