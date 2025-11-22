import { orderService } from "@/lib/order-service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletAddress: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log("params", resolvedParams);

    const walletAddress = resolvedParams.walletAddress;
    console.log("🚀 ~ GET ~ walletAddress:", walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Validate wallet address format (basic validation)
    if (!walletAddress.startsWith("0x") || walletAddress.length !== 42) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Get orders for the user
    const orders = await orderService.getUserOrders(walletAddress);

    // Get analytics for the user's listings
    const analytics = await orderService.getOrderAnalytics(walletAddress);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        analytics: analytics || {
          totalRevenue: 0,
          totalOrders: 0,
          monthlyData: {},
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
