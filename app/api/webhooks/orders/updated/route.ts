import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const orderData = JSON.parse(body);

    console.log("Received orders/updated webhook:", {
      orderId: orderData.id,
      orderNumber: orderData.number,
      financialStatus: orderData.financial_status,
      fulfillmentStatus: orderData.fulfillment_status,
    });

    // Update existing order in shopify_orders table
    const { error } = await supabase
      .from("shopify_orders")
      .update({
        customer_email: orderData.email,
        total_price: parseFloat(orderData.total_price),
        financial_status: orderData.financial_status,
        fulfillment_status: orderData.fulfillment_status,
        order_data: orderData,
        updated_at: orderData.updated_at,
      })
      .eq("shopify_order_id", orderData.id.toString());

    if (error) {
      console.error("Error updating order:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log("Successfully processed orders/updated webhook");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing orders/updated webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
