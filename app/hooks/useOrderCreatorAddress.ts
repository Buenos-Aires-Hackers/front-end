"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase, type UserAddress } from "../../lib/supabase";

interface UseOrderCreatorAddressResult {
  address: UserAddress | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useOrderCreatorAddress = (
  walletAddress?: string
): UseOrderCreatorAddressResult => {
  const {
    data: address = null,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orderCreatorAddress", walletAddress],
    queryFn: async (): Promise<UserAddress | null> => {
      if (!walletAddress) {
        return null;
      }

      // First, find the user by wallet address (normalize to lowercase)
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", walletAddress.toLowerCase())
        .single();

      if (userError) {
        if (userError.code === "PGRST116") {
          // No user found with this wallet address
          return null;
        }
        throw new Error(`Failed to fetch user: ${userError.message}`);
      }

      if (!user) {
        return null;
      }

      // Then fetch the user's default address or first available address
      const { data: addresses, error: addressError } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (addressError) {
        throw new Error(`Failed to fetch address: ${addressError.message}`);
      }

      // Return the default address if available, otherwise return the first address
      return addresses && addresses.length > 0 ? addresses[0] : null;
    },
    enabled: !!walletAddress, // Only run query if walletAddress is provided
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

  return {
    address,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
