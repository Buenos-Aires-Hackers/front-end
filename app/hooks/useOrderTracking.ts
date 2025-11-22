import { OrderDetails, OrderSummary } from "@/lib/types/shopify-webhooks";
import { useQuery } from "@tanstack/react-query";

interface OrdersResponse {
  success: boolean;
  data: {
    orders: OrderSummary[];
    analytics: {
      totalRevenue: number;
      totalOrders: number;
      monthlyData: Record<string, { orders: number; revenue: number }>;
    };
  };
}

interface OrderDetailsResponse {
  success: boolean;
  data: OrderDetails;
}

/**
 * Hook to fetch orders for a specific wallet address (both as creator and purchaser)
 */
export function useUserOrders(walletAddress: string | null) {
  return useQuery({
    queryKey: ["userOrders", walletAddress],
    queryFn: async (): Promise<OrdersResponse> => {
      console.log("ordercheck", walletAddress);

      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      const response = await fetch(
        `/api/orders/user/${walletAddress.toLowerCase()}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch orders");
      }

      return response.json();
    },
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch detailed information for a specific order
 */
export function useOrderDetails(shopifyOrderId: number | null) {
  return useQuery({
    queryKey: ["orderDetails", shopifyOrderId],
    queryFn: async (): Promise<OrderDetailsResponse> => {
      if (!shopifyOrderId) {
        throw new Error("Order ID is required");
      }

      const response = await fetch(`/api/orders/${shopifyOrderId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch order details");
      }

      return response.json();
    },
    enabled: !!shopifyOrderId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to get orders with real-time updates
 */
export function useUserOrdersWithPolling(
  walletAddress: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["userOrdersPolling", walletAddress],
    queryFn: async (): Promise<OrdersResponse> => {
      if (!walletAddress) {
        throw new Error("Wallet address is required");
      }

      const response = await fetch(`/api/orders/user/${walletAddress}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch orders");
      }

      return response.json();
    },
    enabled: !!walletAddress && enabled,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to get pending orders (orders that need attention)
 */
export function usePendingOrders(walletAddress: string | null) {
  const { data, ...rest } = useUserOrders(walletAddress);

  const pendingOrders =
    data?.data.orders.filter(
      (order) => order.order_status === "paid" && !order.tracking_info
    ) || [];

  return {
    ...rest,
    data: {
      ...data,
      pendingOrders,
    },
  };
}

/**
 * Hook to get order analytics and statistics
 */
export function useOrderAnalytics(walletAddress: string | null) {
  const { data, ...rest } = useUserOrders(walletAddress);

  return {
    ...rest,
    analytics: data?.data.analytics || null,
  };
}
