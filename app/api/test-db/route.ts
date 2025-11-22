import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("🔍 Testing database connection...");

    // Test basic connection
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*")
      .limit(5);

    console.log("👥 Users in DB:", users);

    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("*")
      .limit(5);

    console.log("📋 Listings in DB:", listings);

    const { data: addresses, error: addressesError } = await supabase
      .from("user_addresses")
      .select("*")
      .limit(5);

    console.log("📍 Addresses in DB:", addresses);

    // Check if shopify_orders table exists and has data
    const { data: shopifyOrders, error: shopifyOrdersError } = await supabase
      .from("shopify_orders")
      .select("*")
      .limit(5);

    console.log("🛒 Shopify Orders in DB:", shopifyOrders);
    console.log("❌ Shopify Orders Error:", shopifyOrdersError);

    // Check orders table for any records
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .limit(5);

    console.log("📦 Orders table:", orders);
    console.log("❌ Orders Error:", ordersError);

    // Check for purchase_requests table
    const { data: purchaseRequests, error: purchaseRequestsError } =
      await supabase.from("purchase_requests").select("*").limit(5);

    console.log("🛒 Purchase Requests:", purchaseRequests);
    console.log("❌ Purchase Requests Error:", purchaseRequestsError);

    return NextResponse.json({
      success: true,
      data: {
        users: users || [],
        listings: listings || [],
        addresses: addresses || [],
        shopifyOrders: shopifyOrders || [],
        orders: orders || [],
        purchaseRequests: purchaseRequests || [],
        errors: {
          users: usersError?.message,
          listings: listingsError?.message,
          addresses: addressesError?.message,
          shopifyOrders: shopifyOrdersError?.message,
          orders: ordersError?.message,
          purchaseRequests: purchaseRequestsError?.message,
        },
      },
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Database connection failed",
      },
      { status: 500 }
    );
  }
}
