"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Listing } from "../../lib/supabase";

type CreateListingData = Omit<Listing, "id" | "created_at" | "updated_at">;
type UpdateListingData = Partial<CreateListingData> & { id: number };

interface UseCreateListingResult {
  createListing: (data: CreateListingData) => Promise<Listing>;
  isCreating: boolean;
  createError: Error | null;
}

interface UseUpdateListingResult {
  updateListing: (data: UpdateListingData) => Promise<Listing>;
  isUpdating: boolean;
  updateError: Error | null;
}

interface UseDeleteListingResult {
  deleteListing: (id: number) => Promise<void>;
  isDeleting: boolean;
  deleteError: Error | null;
}

export const useCreateListing = (): UseCreateListingResult => {
  const queryClient = useQueryClient();

  const {
    mutateAsync: createListing,
    isPending: isCreating,
    error: createError,
  } = useMutation({
    mutationFn: async (data: CreateListingData): Promise<Listing> => {
      const { data: listing, error } = await supabase
        .from("listings")
        .insert([data])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create listing: ${error.message}`);
      }

      return listing;
    },
    onSuccess: () => {
      // Invalidate listings queries to refetch the data
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });

  return {
    createListing,
    isCreating,
    createError: createError as Error | null,
  };
};

export const useUpdateListing = (): UseUpdateListingResult => {
  const queryClient = useQueryClient();

  const {
    mutateAsync: updateListing,
    isPending: isUpdating,
    error: updateError,
  } = useMutation({
    mutationFn: async (data: UpdateListingData): Promise<Listing> => {
      const { id, ...updateData } = data;

      const { data: listing, error } = await supabase
        .from("listings")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update listing: ${error.message}`);
      }

      return listing;
    },
    onSuccess: (updatedListing) => {
      // Invalidate and update relevant queries
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({
        queryKey: ["listing", updatedListing.id],
      });
    },
  });

  return {
    updateListing,
    isUpdating,
    updateError: updateError as Error | null,
  };
};

export const useDeleteListing = (): UseDeleteListingResult => {
  const queryClient = useQueryClient();

  const {
    mutateAsync: deleteListing,
    isPending: isDeleting,
    error: deleteError,
  } = useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const { error } = await supabase.from("listings").delete().eq("id", id);

      if (error) {
        throw new Error(`Failed to delete listing: ${error.message}`);
      }
    },
    onSuccess: (_, deletedId) => {
      // Remove the deleted listing from cache and invalidate listings
      queryClient.removeQueries({ queryKey: ["listing", deletedId] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });

  return {
    deleteListing,
    isDeleting,
    deleteError: deleteError as Error | null,
  };
};
