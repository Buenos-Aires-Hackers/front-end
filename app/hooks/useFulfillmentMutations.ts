"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

interface CreateFulfillmentOrderInput {
  listingId: number;
  fulfillerId: string; // wallet address of fulfiller
  checkoutUrl: string;
  status?: string;
}

interface UpdateFulfillmentStatusInput {
  orderId: string;
  status: string;
  trackingNumber?: string;
  notes?: string;
}

interface UseFulfillmentMutationsResult {
  createFulfillmentOrder: (input: CreateFulfillmentOrderInput) => Promise<any>;
  updateFulfillmentStatus: (
    input: UpdateFulfillmentStatusInput
  ) => Promise<any>;
  isCreating: boolean;
  isUpdating: boolean;
  error: Error | null;
}

export const useFulfillmentMutations = (): UseFulfillmentMutationsResult => {
  const queryClient = useQueryClient();

  const createOrderMutation = useMutation({
    mutationFn: async (input: CreateFulfillmentOrderInput) => {
      // First, get the listing to extract the buyer info
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .select("*")
        .eq("id", input.listingId)
        .single();

      if (listingError) {
        throw new Error(`Failed to fetch listing: ${listingError.message}`);
      }

      if (!listing.ordered_by) {
        throw new Error("No buyer found for this listing");
      }

      // Get buyer user ID from wallet address (normalize to lowercase)
      const { data: buyer, error: buyerError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", listing.ordered_by?.toLowerCase())
        .single();

      if (buyerError && buyerError.code !== "PGRST116") {
        throw new Error(`Failed to fetch buyer: ${buyerError.message}`);
      }

      // Get fulfiller user ID from wallet address
      const { data: fulfiller, error: fulfillerError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", input.fulfillerId)
        .single();

      if (fulfillerError && fulfillerError.code !== "PGRST116") {
        throw new Error(`Failed to fetch fulfiller: ${fulfillerError.message}`);
      }

      // Create the order record
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          listing_id: input.listingId,
          buyer_id: buyer?.id || null,
          fulfiller_id: fulfiller?.id || null,
          status: input.status || "fulfiller_processing",
          order_type: "purchase",
          quantity: 1,
          unit_price: listing.price,
          total_amount: listing.price,
          notes: `Checkout URL: ${input.checkoutUrl}`,
        })
        .select("*")
        .single();

      if (orderError) {
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      // Create order roles
      const roles = [];

      if (buyer?.id) {
        roles.push({
          order_id: order.id,
          user_id: buyer.id,
          role: "buyer",
        });
      }

      if (fulfiller?.id) {
        roles.push({
          order_id: order.id,
          user_id: fulfiller.id,
          role: "fulfiller",
        });
      }

      if (roles.length > 0) {
        const { error: rolesError } = await supabase
          .from("order_roles")
          .insert(roles);

        if (rolesError) {
          console.warn("Failed to create order roles:", rolesError);
        }
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (input: UpdateFulfillmentStatusInput) => {
      const updateData: any = {
        status: input.status,
        updated_at: new Date().toISOString(),
      };

      if (input.trackingNumber) {
        updateData.tracking_number = input.trackingNumber;
      }

      if (input.notes) {
        updateData.notes = input.notes;
      }

      const { data, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", input.orderId)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed to update order status: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return {
    createFulfillmentOrder: createOrderMutation.mutateAsync,
    updateFulfillmentStatus: updateStatusMutation.mutateAsync,
    isCreating: createOrderMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    error: createOrderMutation.error || updateStatusMutation.error,
  };
};
