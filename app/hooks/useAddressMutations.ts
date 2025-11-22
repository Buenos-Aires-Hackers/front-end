'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, type UserAddress } from '@/lib/supabase';

export type AddressUpsertInput = Partial<Omit<UserAddress, 'created_at' | 'updated_at'>> & {
  user_id: string;
  address_type?: string;
};

export const useAddressMutations = () => {
  const queryClient = useQueryClient();

  const {
    mutateAsync: upsertAddress,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (payload: AddressUpsertInput): Promise<UserAddress> => {
      const { data, error } = await supabase
        .from('user_addresses')
        .upsert({
          ...payload,
          is_default: payload.is_default ?? true,
        })
        .select()
        .single<UserAddress>();

      if (error) {
        throw new Error(`Failed to save address: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-data'] });
    },
  });

  return {
    saveAddress: upsertAddress,
    isSavingAddress: isPending,
    saveAddressError: error as Error | null,
  };
};
