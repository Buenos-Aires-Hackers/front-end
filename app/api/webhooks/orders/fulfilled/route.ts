import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const orderData = JSON.parse(body);

    console.log("Received orders/fulfilled webhook:", {
      orderId: orderData.id,
      orderNumber: orderData.number,
      fulfillmentStatus: orderData.fulfillment_status,
    });

    // Update order fulfillment status
    const { error } = await supabase
      .from("shopify_orders")
      .update({
        fulfillment_status: orderData.fulfillment_status,
        updated_at: orderData.updated_at,
      })
      .eq("shopify_order_id", orderData.id.toString());

    if (error) {
      console.error("Error updating order fulfillment status:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log("Successfully processed orders/fulfilled webhook");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing orders/fulfilled webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
