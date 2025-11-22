"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect, useMemo, useState } from "react";
import { supabase, type User } from "../../lib/supabase";
import { useUserRegistration } from "./useUserRegistration";

interface UseCurrentUserResult {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useCurrentUser = (): UseCurrentUserResult => {
  const { allAccounts } = useAppKitAccount();
  const connectedAddress = useMemo(
    () => allAccounts[0]?.address?.toLowerCase(),
    [allAccounts]
  );
  const { registerUser } = useUserRegistration();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrCreateUser = async (walletAddress: string) => {
    setIsLoading(true);
    setError(null);

    console.log("🔍 Fetching user for wallet:", walletAddress);

    try {
      // First try to fetch existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("wallet_address", walletAddress.toLowerCase())
        .single();

      console.log("🔍 User lookup result:", { existingUser, fetchError });

      if (existingUser) {
        setUser(existingUser);
        return existingUser;
      }

      // If user doesn't exist (PGRST116 = no rows found), create them
      if (fetchError && fetchError.code === "PGRST116") {
        console.log("Creating new user for wallet:", walletAddress);
        try {
          const newUser = await registerUser({
            walletAddress: walletAddress.toLowerCase(),
            roles: ["buyer", "fulfiller"], // Give both roles by default
          });
          console.log("New user created:", newUser);
          setUser(newUser);
          return newUser;
        } catch (regError) {
          console.error("Failed to create user:", regError);
          // Continue without user - the app should still work
          return null;
        }
      }

      // If there's another error, throw it
      if (fetchError) {
        throw new Error(`Failed to fetch user: ${fetchError.message}`);
      }

      return null;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch or create user";
      setError(errorMessage);
      console.error("Error in fetchOrCreateUser:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    if (connectedAddress) {
      fetchOrCreateUser(connectedAddress);
    }
  };

  // Auto-fetch/create user when wallet connects
  useEffect(() => {
    if (connectedAddress) {
      fetchOrCreateUser(connectedAddress);
    } else {
      // Clear user when wallet disconnects
      setUser(null);
      setError(null);
    }
  }, [connectedAddress]);

  return {
    user,
    isLoading,
    error,
    refetch,
  };
};
