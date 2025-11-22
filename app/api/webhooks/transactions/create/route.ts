import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const transactionData = JSON.parse(body);

    console.log("Received transactions/create webhook:", {
      transactionId: transactionData.id,
      orderId: transactionData.order_id,
      amount: transactionData.amount,
      kind: transactionData.kind,
      status: transactionData.status,
    });

    // Update order with transaction information
    const { error } = await supabase
      .from("shopify_orders")
      .update({
        financial_status: transactionData.status,
        order_data: {
          ...transactionData.order_data,
          last_transaction: transactionData,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("shopify_order_id", transactionData.order_id.toString());

    if (error) {
      console.error("Error updating transaction data:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log("Successfully processed transactions/create webhook");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing transactions/create webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
