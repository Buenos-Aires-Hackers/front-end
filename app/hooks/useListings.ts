"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase, type Listing } from "../../lib/supabase";

interface UseListingsOptions {
  category?: string;
  inStock?: boolean;
  orderBy?: "created_at" | "price" | "rating" | "title";
  orderDirection?: "asc" | "desc";
  limit?: number;
  hideAvailable?: boolean; // Show only available items (not purchased)
  showUserPurchases?: boolean; // Show user's purchased items
  userEmail?: string; // Current user's email for filtering purchases
}

interface UseListingsResult {
  listings: Listing[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useListings = (
  options: UseListingsOptions = {}
): UseListingsResult => {
  const {
    category,
    inStock,
    orderBy = "created_at",
    orderDirection = "desc",
    limit = 50,
    hideAvailable = true, // By default, hide purchased items
    showUserPurchases = false,
    userEmail,
  } = options;

  const {
    data: listings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "listings",
      //   {
      //     category,
      //     inStock,
      //     orderBy,
      //     orderDirection,
      //     limit,
      //     hideAvailable,
      //     showUserPurchases,
      //     userEmail,
      //   },
    ],
    queryFn: async (): Promise<Listing[]> => {
      let query = supabase
        .from("listings")
        .select("*")
        .order(orderBy, { ascending: orderDirection === "asc" })
        .limit(limit);

      // Apply filters if provided
      if (category) {
        query = query.eq("category", category);
      }

      if (inStock !== undefined) {
        query = query.eq("in_stock", inStock);
      }

      // Filter based on purchase status
      if (showUserPurchases && userEmail) {
        // Show only items purchased by this user
        query = query.eq("purchaser_email", userEmail);
      } else if (hideAvailable) {
        // Hide purchased items (show only available items)
        query = query.or("status.is.null,status.neq.sold");
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch listings: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 1000 * 20, // Consider data fresh for 20 seconds
  });

  return {
    listings,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
