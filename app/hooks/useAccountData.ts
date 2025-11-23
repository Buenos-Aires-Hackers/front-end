"use client";

import {
  supabase,
  type AccountData,
  type AccountOrder,
  type Listing,
  type User,
  type UserAddress,
} from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

const EMPTY_ACCOUNT: AccountData = {
  user: null,
  addresses: [],
  orders: [],
  listings: [],
};

export const useAccountData = (walletAddress?: string) => {
  return useQuery<AccountData, Error>({
    queryKey: ["account-data", walletAddress],
    enabled: Boolean(walletAddress),
    queryFn: async () => {
      if (!walletAddress) {
        return EMPTY_ACCOUNT;
      }

      // Try different case variations of wallet address
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("*")
        .or(
          `wallet_address.eq.${walletAddress},wallet_address.eq.${walletAddress.toLowerCase()},wallet_address.eq.${walletAddress.toUpperCase()}`
        )
        .maybeSingle<User>();

      if (userError) {
        console.log("User lookup error:", userError);
        // Continue without user record - we'll still fetch other data
      }

      console.log("User record found:", userRecord);
      console.log("Wallet address searched:", walletAddress);

      // Debug: Check what users are actually in the database
      const { data: allUsers } = await supabase
        .from("users")
        .select("wallet_address, id, full_name")
        .limit(10);
      console.log("All users in DB:", allUsers);

      // Debug: Check all addresses in database
      const { data: allAddresses } = await supabase
        .from("user_addresses")
        .select("*, users(wallet_address, full_name)")
        .limit(10);
      console.log("All addresses in DB:", allAddresses);

      // If no user found, try to find addresses by wallet address directly
      let addressesByWallet: UserAddress[] = [];
      if (!userRecord && allUsers && allUsers.length > 0) {
        // Find user by case-insensitive wallet address match
        const matchingUser = allUsers.find(
          (user) =>
            user.wallet_address?.toLowerCase() === walletAddress?.toLowerCase()
        );

        if (matchingUser && allAddresses) {
          addressesByWallet = allAddresses.filter(
            (addr) => addr.user_id === matchingUser.id
          ) as UserAddress[];
        }

        console.log("Matching user found:", matchingUser);
        console.log("Addresses found by wallet:", addressesByWallet);
      }

      const [addresses, orders, listings] = await Promise.all([
        // Fetch addresses by user record or use wallet-based addresses
        userRecord
          ? supabase
              .from("user_addresses")
              .select("*")
              .eq("user_id", userRecord.id)
              .order("created_at", { ascending: false })
              .then(({ data, error }) => {
                if (error) {
                  console.log("Addresses error:", error);
                  return [];
                }
                console.log("Addresses found by user_id:", data);
                return (data ?? []) as UserAddress[];
              })
          : Promise.resolve(addressesByWallet),
        // Fetch orders only if user record exists
        userRecord
          ? supabase
              .from("orders")
              .select("*, listings(*)")
              .or(
                `user_id.eq.${userRecord.id},buyer_id.eq.${userRecord.id},fulfiller_id.eq.${userRecord.id}`
              )
              .order("created_at", { ascending: false })
              .then(({ data, error }) => {
                if (error) {
                  console.log("Orders error:", error);
                  return [];
                }
                console.log("Orders found:", data);
                return (data ?? []).map((order) => ({
                  ...order,
                  listing:
                    (order as AccountOrder & { listings?: Listing[] })
                      .listings?.[0] ?? null,
                })) as AccountOrder[];
              })
          : Promise.resolve([]),
        // Always try to fetch listings by wallet address
        supabase
          .from("listings")
          .select("*")
          .order("created_at", { ascending: false })
          .then(({ data: allData, error: allError }) => {
            if (allError) {
              console.log("Failed to load listings:", allError);
              return [];
            }
            console.log("All listings from DB:", allData);
            console.log(
              "Looking for wallet:",
              walletAddress,
              "or user_id:",
              userRecord?.id
            );

            // Filter by wallet address in various possible fields
            const userListings = (allData ?? []).filter(
              (listing) =>
                listing.ordered_by?.toLowerCase() ===
                  walletAddress?.toLowerCase() ||
                listing.ordered_by_user_id === userRecord?.id
            );

            console.log("Filtered user listings:", userListings);
            console.log("Total listings in DB:", allData?.length);
            console.log("User listings count:", userListings.length);

            return userListings as Listing[];
          }),
      ]);

      return {
        user: userRecord || null,
        addresses,
        orders,
        listings,
      };
    },
  });
};
