"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase, type Order } from "../../lib/supabase";

interface FulfillmentOrder extends Order {
  listing?: any;
  buyer?: any;
  fulfiller?: any;
}

interface UseFulfillmentOrdersResult {
  orders: FulfillmentOrder[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface UseFulfillmentOrdersOptions {
  walletAddress?: string;
  role?: "buyer" | "fulfiller" | "all";
  status?: string;
  limit?: number;
}

export const useFulfillmentOrders = (
  options: UseFulfillmentOrdersOptions = {}
): UseFulfillmentOrdersResult => {
  const { walletAddress, role = "all", status, limit = 50 } = options;

  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["fulfillmentOrders", walletAddress, role, status, limit],
    queryFn: async (): Promise<FulfillmentOrder[]> => {
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          listing:listings(*),
          buyer:users!orders_buyer_id_fkey(id, wallet_address, full_name, email),
          fulfiller:users!orders_fulfiller_id_fkey(id, wallet_address, full_name, email)
        `
        )
        .order("created_at", { ascending: false });

      // Filter by status if provided
      if (status) {
        query = query.eq("status", status);
      }

      // Filter by user role if wallet address is provided
      if (walletAddress && role !== "all") {
        // First get the user ID
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", walletAddress)
          .single();

        if (userError && userError.code !== "PGRST116") {
          throw new Error(`Failed to fetch user: ${userError.message}`);
        }

        if (user) {
          if (role === "buyer") {
            query = query.eq("buyer_id", user.id);
          } else if (role === "fulfiller") {
            query = query.eq("fulfiller_id", user.id);
          }
        } else {
          // No user found, return empty array
          return [];
        }
      }

      // Apply limit
      query = query.limit(limit);

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch fulfillment orders: ${error.message}`);
      }

      return data || [];
    },
    enabled: true, // Always enabled, we filter in the query
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });

  return {
    orders,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
