import { orderService } from "@/lib/order-service";
import { supabase } from "@/lib/supabase";
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

    // First, try to find the order in our system by order_id or checkout_id
    const { data: existingOrder } = await supabase
      .from("shopify_orders")
      .select("shopify_order_id, shopify_checkout_id")
      .or(
        `shopify_order_id.eq.${fulfillmentData.order_id},shopify_checkout_id.eq.${fulfillmentData.order_id}`
      )
      .maybeSingle();

    if (!existingOrder) {
      console.warn(
        `Order ${fulfillmentData.order_id} not found in our system, skipping fulfillment tracking`
      );
      return NextResponse.json({
        success: true,
        message: "Order not in our system, skipped",
      });
    }

    const actualOrderId = existingOrder.shopify_order_id;
    console.log(`Found order in system: ${actualOrderId}`);

    // Create fulfillment tracking record
    const trackingRecord = {
      shopify_order_id: actualOrderId,
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
        actualOrderId,
        "fulfilled",
        undefined,
        "fulfilled"
      );

      if (!updateResult.success) {
        console.warn(
          `Failed to update order status for ${actualOrderId}: ${updateResult.error}`
        );
        // Continue processing - this is not a critical failure
      }
    }

    // Add webhook event to order record (non-critical)
    try {
      await orderService.addWebhookEvent(actualOrderId, {
        topic: "fulfillments/create",
        event_id: headers!["x-shopify-event-id"],
        timestamp: new Date().toISOString(),
        processed: true,
      });
    } catch (error) {
      console.warn(
        `Failed to add webhook event for order ${actualOrderId}:`,
        error
      );
      // Continue processing - this is not a critical failure
    }

    // Mark event as processed
    await markEventProcessed(headers!["x-shopify-event-id"]);

    console.log("Successfully processed fulfillment created webhook:", {
      originalId: fulfillmentData.order_id,
      actualOrderId: actualOrderId,
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
