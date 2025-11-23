import { orderService } from "@/lib/order-service";
import { supabase } from "@/lib/supabase";
import { OrderPaidPayload } from "@/lib/types/shopify-webhooks";
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

    // Log warning if webhook secret not configured
    if (validation.error === "Webhook secret not configured") {
      console.warn(
        "⚠️ SECURITY WARNING: Webhook secret not configured - signatures not verified"
      );
    }

    // Skip if already processed (prevent duplicates)
    const eventId = request.headers.get("x-shopify-event-id");
    if (eventId) {
      const { data: existingLog } = await supabase
        .from("webhook_logs")
        .select("id")
        .eq("event_id", eventId)
        .single();

      if (existingLog) {
        console.log("Webhook already processed, skipping:", eventId);
        return NextResponse.json({
          success: true,
          message: "Already processed",
        });
      }
    }

    const { headers } = validation;
    const orderData: OrderPaidPayload = JSON.parse(payload);

    // Log webhook event
    await logWebhookEvent("orders/paid", headers!, orderData);

    console.log("Processing order paid webhook for order ID:", orderData.id);

    // Extract listing ID to update status
    const listingId = extractListingIdFromOrder(orderData);

    // First try to update existing order, if it doesn't exist, create it
    let result = await orderService.updateOrderStatus(
      orderData.id,
      "paid",
      orderData.financial_status,
      orderData.fulfillment_status || undefined
    );

    // If update failed (order doesn't exist), create the order first
    if (!result.success && result.error?.includes("No rows")) {
      console.log("Order not found, creating new order record");

      // Extract data from order payload
      const purchaserWallet = extractPurchaserFromOrder(orderData);
      const creatorWallet = listingId
        ? await getCreatorFromListing(listingId)
        : null;

      const orderRecord = {
        shopify_order_id: orderData.id,
        shopify_checkout_id: orderData.checkout_id?.toString(),
        listing_id: listingId || undefined, // Convert null to undefined
        purchaser_wallet_address: purchaserWallet || "unknown",
        creator_wallet_address: creatorWallet || "unknown",
        order_status: "paid" as const,
        financial_status: orderData.financial_status,
        fulfillment_status: orderData.fulfillment_status || "unfulfilled",
        total_price: parseFloat(orderData.total_price),
        currency: orderData.currency,
        shopify_customer_id: orderData.customer?.id,
        shopify_customer_email: orderData.email,
        shipping_address: orderData.shipping_address,
        line_items: orderData.line_items,
      };

      result = await orderService.upsertOrder(orderRecord);
    }

    // Always update listing status to sold when order is paid (regardless of order creation)
    if (listingId) {
      const purchaserWallet = extractPurchaserFromOrder(orderData);
      const { error: listingUpdateError } = await supabase
        .from("listings")
        .update({
          status: "sold",
          in_stock: false,
          purchased_at: new Date().toISOString(),
          purchaser_email: orderData.email,
          purchased_by: purchaserWallet || "unknown", // Track who fulfilled the order
        })
        .eq("id", listingId);

      if (listingUpdateError) {
        console.error(
          "Error updating listing status to sold:",
          listingUpdateError
        );
      }
    }

    if (!result.success) {
      console.error("Failed to process order:", result.error);
      await logWebhookEvent(
        "orders/paid",
        headers!,
        orderData,
        false,
        result.error
      );
      return NextResponse.json(
        { error: "Failed to process order" },
        { status: 500 }
      );
    }

    // Add webhook event to order record (non-critical)
    try {
      await orderService.addWebhookEvent(orderData.id, {
        topic: "orders/paid",
        event_id: headers!["x-shopify-event-id"],
        timestamp: new Date().toISOString(),
        processed: true,
      });
    } catch (error) {
      console.warn(
        `Failed to add webhook event for order ${orderData.id}:`,
        error
      );
    }

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
