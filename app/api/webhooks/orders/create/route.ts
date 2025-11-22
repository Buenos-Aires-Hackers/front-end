import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const orderData = JSON.parse(body);

    console.log("Received orders/create webhook:", {
      orderId: orderData.id,
      orderNumber: orderData.number,
      email: orderData.email,
      total: orderData.total_price,
      status: orderData.financial_status,
    });

    // Insert new order into shopify_orders table
    const { error } = await supabase.from("shopify_orders").insert({
      shopify_order_id: orderData.id.toString(),
      order_number: orderData.number.toString(),
      customer_email: orderData.email,
      total_price: parseFloat(orderData.total_price),
      currency: orderData.currency,
      financial_status: orderData.financial_status,
      fulfillment_status: orderData.fulfillment_status || "unfulfilled",
      order_data: orderData,
      created_at: orderData.created_at,
      updated_at: orderData.updated_at,
    });

    if (error) {
      console.error("Error inserting new order:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log("Successfully processed orders/create webhook");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing orders/create webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
