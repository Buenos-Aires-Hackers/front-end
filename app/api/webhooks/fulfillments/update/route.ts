import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const fulfillmentData = JSON.parse(body);

    console.log("Received fulfillments/update webhook:", {
      fulfillmentId: fulfillmentData.id,
      orderId: fulfillmentData.order_id,
      trackingNumber: fulfillmentData.tracking_number,
      status: fulfillmentData.status,
    });

    // Update order with latest fulfillment information
    const { error } = await supabase
      .from("shopify_orders")
      .update({
        fulfillment_data: fulfillmentData,
        tracking_number: fulfillmentData.tracking_number,
        tracking_url: fulfillmentData.tracking_urls?.[0],
        updated_at: new Date().toISOString(),
      })
      .eq("shopify_order_id", fulfillmentData.order_id.toString());

    if (error) {
      console.error("Error updating fulfillment data:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log("Successfully processed fulfillments/update webhook");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing fulfillments/update webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
