"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase, type Listing } from "../../lib/supabase";

interface UseListingResult {
  listing: Listing | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useListing = (id: number | string): UseListingResult => {
  const {
    data: listing = null,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["listing", id],
    queryFn: async (): Promise<Listing | null> => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          return null;
        }
        throw new Error(`Failed to fetch listing: ${error.message}`);
      }

      return data;
    },
    enabled: !!id, // Only run query if id is provided
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

  return {
    listing,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
