import { orderService } from "@/lib/order-service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopifyOrderId: string }> }
) {
  try {
    const resolvedParams = await params;
    const shopifyOrderId = parseInt(resolvedParams.shopifyOrderId);

    if (isNaN(shopifyOrderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Get detailed order information
    const orderDetails = await orderService.getOrderDetails(shopifyOrderId);

    if (!orderDetails) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: orderDetails,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    return NextResponse.json(
      { error: "Failed to fetch order details" },
      { status: 500 }
    );
  }
}
