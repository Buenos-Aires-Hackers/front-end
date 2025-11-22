"use client";

import { useState } from "react";
import { supabase, type User } from "../../lib/supabase";

interface RegisterUserInput {
  walletAddress: string;
  email?: string;
  username?: string;
  fullName?: string;
  phone?: string;
  roles?: string[];
}

interface UseUserRegistrationResult {
  registerUser: (input: RegisterUserInput) => Promise<User>;
  isRegistering: boolean;
  error: string | null;
}

export const useUserRegistration = (): UseUserRegistrationResult => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerUser = async (input: RegisterUserInput): Promise<User> => {
    setIsRegistering(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "upsert_user_by_wallet",
        {
          wallet_addr: input.walletAddress.toLowerCase(), // Normalize to lowercase
          user_email: input.email || null,
          user_username: input.username || null,
          user_full_name: input.fullName || null,
          user_phone: input.phone || null,
          user_roles: input.roles || ["buyer"],
        }
      );

      if (rpcError) {
        throw new Error(`Failed to register user: ${rpcError.message}`);
      }

      if (!data) {
        throw new Error("No user data returned from registration");
      }

      return data as User;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to register user";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  return {
    registerUser,
    isRegistering,
    error,
  };
};
