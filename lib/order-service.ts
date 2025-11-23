import { supabase } from "./supabase";
import {
  FulfillmentTrackingRecord,
  OrderDetails,
  OrderSummary,
  ShopifyOrderRecord,
  WebhookEvent,
  WebhookProcessingResult,
} from "./types/shopify-webhooks";

export class OrderService {
  private supabase = supabase;
  /**
   * Create or update a Shopify order record
   */
  async upsertOrder(
    orderData: Partial<ShopifyOrderRecord>
  ): Promise<WebhookProcessingResult> {
    try {
      const { data, error } = await this.supabase
        .from("shopify_orders")
        .upsert(orderData, { onConflict: "shopify_order_id" })
        .select("id")
        .single();

      if (error) {
        console.error("Error upserting order:", error);
        return {
          success: false,
          message: "Failed to save order",
          error: error.message,
        };
      }

      // Update listing statistics if this is a new order
      if (orderData.listing_id && orderData.total_price) {
        await this.updateListingStats(
          orderData.listing_id,
          orderData.total_price
        );
      }

      return {
        success: true,
        message: "Order saved successfully",
        orderId: data.id,
      };
    } catch (error) {
      console.error("Error in upsertOrder:", error);
      return {
        success: false,
        message: "Unexpected error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Add webhook event to order record
   */
  async addWebhookEvent(
    shopifyOrderId: number,
    webhookEvent: WebhookEvent
  ): Promise<void> {
    try {
      // First get the current webhook_events array
      const { data: currentOrder, error: fetchError } = await this.supabase
        .from("shopify_orders")
        .select("webhook_events")
        .eq("shopify_order_id", shopifyOrderId)
        .maybeSingle();

      if (fetchError) {
        console.error(
          "Error fetching current order for webhook event:",
          fetchError
        );
        return;
      }

      // If no order exists, skip adding webhook event (order not in our system)
      if (!currentOrder) {
        console.warn(
          `Order ${shopifyOrderId} not found in system, skipping webhook event`
        );
        return;
      }

      const currentEvents = currentOrder?.webhook_events || [];
      const updatedEvents = [...currentEvents, webhookEvent];

      const { error: updateError } = await this.supabase
        .from("shopify_orders")
        .update({ webhook_events: updatedEvents })
        .eq("shopify_order_id", shopifyOrderId);

      if (updateError) {
        console.error("Error adding webhook event:", updateError);
      }
    } catch (error) {
      console.error("Error in addWebhookEvent:", error);
    }
  }

  /**
   * Create or update fulfillment tracking
   */
  async upsertFulfillmentTracking(
    trackingData: Partial<FulfillmentTrackingRecord>
  ): Promise<WebhookProcessingResult> {
    try {
      const { data, error } = await this.supabase
        .from("fulfillment_tracking")
        .upsert(trackingData, { onConflict: "shopify_fulfillment_id" })
        .select("id")
        .single();

      if (error) {
        console.error("Error upserting fulfillment tracking:", error);
        return {
          success: false,
          message: "Failed to save tracking info",
          error: error.message,
        };
      }

      return { success: true, message: "Tracking info saved successfully" };
    } catch (error) {
      console.error("Error in upsertFulfillmentTracking:", error);
      return {
        success: false,
        message: "Unexpected error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get orders for a user (both as creator and purchaser)
   */
  async getUserOrders(walletAddress: string): Promise<OrderSummary[]> {
    try {
      const { data, error } = await this.supabase
        .from("shopify_orders")
        .select(
          `
          id,
          shopify_order_id,
          order_status,
          total_price,
          currency,
          created_at,
          listings(title),
          fulfillment_tracking(tracking_number, tracking_url, shipment_status)
        `
        )
        .or(
          `purchaser_wallet_address.eq.${walletAddress},creator_wallet_address.eq.${walletAddress}`
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user orders:", error);
        return [];
      }

      return data.map((order) => ({
        id: order.id,
        shopify_order_id: order.shopify_order_id,
        listing_title: (order.listings as any)?.title || "Unknown Item",
        order_status: order.order_status,
        total_price: order.total_price,
        currency: order.currency,
        created_at: order.created_at,
        tracking_info: order.fulfillment_tracking?.[0]
          ? {
              tracking_number: order.fulfillment_tracking[0].tracking_number,
              tracking_url: order.fulfillment_tracking[0].tracking_url,
              shipment_status: order.fulfillment_tracking[0].shipment_status,
            }
          : undefined,
      }));
    } catch (error) {
      console.error("Error in getUserOrders:", error);
      return [];
    }
  }

  /**
   * Get detailed order information
   */
  async getOrderDetails(shopifyOrderId: number): Promise<OrderDetails | null> {
    try {
      const { data, error } = await this.supabase
        .from("shopify_orders")
        .select(
          `
          *,
          listings!inner(id, title, description, price, image_url),
          fulfillment_tracking(*)
        `
        )
        .eq("shopify_order_id", shopifyOrderId)
        .single();

      if (error) {
        console.error("Error fetching order details:", error);
        return null;
      }

      return {
        ...data,
        listing: data.listings,
        fulfillment_tracking: data.fulfillment_tracking || [],
      };
    } catch (error) {
      console.error("Error in getOrderDetails:", error);
      return null;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    shopifyOrderId: number,
    status: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded",
    financialStatus?: string,
    fulfillmentStatus?: string
  ): Promise<WebhookProcessingResult> {
    try {
      const updateData: any = { order_status: status };
      if (financialStatus) updateData.financial_status = financialStatus;
      if (fulfillmentStatus) updateData.fulfillment_status = fulfillmentStatus;

      const { error } = await this.supabase
        .from("shopify_orders")
        .update(updateData)
        .eq("shopify_order_id", shopifyOrderId);

      if (error) {
        console.error("Error updating order status:", error);
        return {
          success: false,
          message: "Failed to update order status",
          error: error.message,
        };
      }

      return { success: true, message: "Order status updated successfully" };
    } catch (error) {
      console.error("Error in updateOrderStatus:", error);
      return {
        success: false,
        message: "Unexpected error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get orders for a specific listing (for creators)
   */
  async getListingOrders(listingId: string): Promise<OrderSummary[]> {
    try {
      const { data, error } = await this.supabase
        .from("shopify_orders")
        .select(
          `
          id,
          shopify_order_id,
          order_status,
          total_price,
          currency,
          created_at,
          purchaser_wallet_address,
          fulfillment_tracking(tracking_number, tracking_url, shipment_status)
        `
        )
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching listing orders:", error);
        return [];
      }

      return data.map((order) => ({
        id: order.id,
        shopify_order_id: order.shopify_order_id,
        listing_title: "Your Listing", // We already know it's their listing
        order_status: order.order_status,
        total_price: order.total_price,
        currency: order.currency,
        created_at: order.created_at,
        tracking_info: order.fulfillment_tracking?.[0]
          ? {
              tracking_number: order.fulfillment_tracking[0].tracking_number,
              tracking_url: order.fulfillment_tracking[0].tracking_url,
              shipment_status: order.fulfillment_tracking[0].shipment_status,
            }
          : undefined,
      }));
    } catch (error) {
      console.error("Error in getListingOrders:", error);
      return [];
    }
  }

  /**
   * Update listing statistics when orders are created/updated
   */
  private async updateListingStats(
    listingId: string,
    orderAmount: number
  ): Promise<void> {
    try {
      // Get current stats
      const { data: listing, error: fetchError } = await this.supabase
        .from("listings")
        .select("total_orders, total_revenue")
        .eq("id", listingId)
        .single();

      if (fetchError) {
        console.error("Error fetching listing for stats update:", fetchError);
        return;
      }

      const currentOrders = listing?.total_orders || 0;
      const currentRevenue = listing?.total_revenue || 0;

      const { error: updateError } = await this.supabase
        .from("listings")
        .update({
          total_orders: currentOrders + 1,
          total_revenue: currentRevenue + orderAmount,
          last_order_at: new Date().toISOString(),
        })
        .eq("id", listingId);

      if (updateError) {
        console.error("Error updating listing stats:", updateError);
      }
    } catch (error) {
      console.error("Error in updateListingStats:", error);
    }
  }

  /**
   * Get order analytics for a user's listings
   */
  async getOrderAnalytics(walletAddress: string) {
    try {
      const { data, error } = await this.supabase
        .from("shopify_orders")
        .select(
          `
          total_price,
          currency,
          order_status,
          created_at,
          listings!inner(wallet_address)
        `
        )
        .eq("listings.wallet_address", walletAddress)
        .eq("order_status", "paid");

      if (error) {
        console.error("Error fetching order analytics:", error);
        return null;
      }

      const totalRevenue = data.reduce(
        (sum, order) => sum + (order.total_price || 0),
        0
      );
      const totalOrders = data.length;

      // Group by month for trend analysis
      const monthlyData = data.reduce((acc, order) => {
        const month = new Date(order.created_at).toISOString().slice(0, 7);
        if (!acc[month]) {
          acc[month] = { orders: 0, revenue: 0 };
        }
        acc[month].orders += 1;
        acc[month].revenue += order.total_price || 0;
        return acc;
      }, {} as Record<string, { orders: number; revenue: number }>);

      return {
        totalRevenue,
        totalOrders,
        monthlyData,
      };
    } catch (error) {
      console.error("Error in getOrderAnalytics:", error);
      return null;
    }
  }
}

export const orderService = new OrderService();
