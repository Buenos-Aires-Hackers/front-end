import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const orderData = JSON.parse(body);

    console.log("Received orders/cancelled webhook:", {
      orderId: orderData.id,
      orderNumber: orderData.number,
      cancelReason: orderData.cancel_reason,
    });

    // Update order cancellation status
    const { error } = await supabase
      .from("shopify_orders")
      .update({
        financial_status: "cancelled",
        fulfillment_status: "cancelled",
        cancelled_at: orderData.cancelled_at,
        cancel_reason: orderData.cancel_reason,
        updated_at: orderData.updated_at,
      })
      .eq("shopify_order_id", orderData.id.toString());

    if (error) {
      console.error("Error updating order cancellation:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Restore listing availability if order was cancelled
    if (orderData.line_items && orderData.line_items.length > 0) {
      for (const lineItem of orderData.line_items) {
        const productId = lineItem.product_id?.toString();

        if (productId) {
          // Reset listing status to 'available'
          const { error: listingError } = await supabase
            .from("listings")
            .update({
              status: "available",
              purchased_at: null,
              purchaser_email: null,
            })
            .eq("shopify_product_id", productId);

          if (listingError) {
            console.error(
              "Error restoring listing availability:",
              listingError
            );
          } else {
            console.log(
              `Restored listing availability for product ${productId}`
            );
          }
        }
      }
    }

    console.log("Successfully processed orders/cancelled webhook");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing orders/cancelled webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
