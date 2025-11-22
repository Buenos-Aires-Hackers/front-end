"use client";

import { useState } from "react";
import {
  ShopifyCartService,
  type ShopifyCartInput,
  type ShopifyCartResponse,
} from "../../lib/shopify-cart";

interface UseShopifyCartResult {
  createCart: (input: ShopifyCartInput) => Promise<ShopifyCartResponse>;
  getProductVariant: (url: string) => Promise<string | null>;
  isCreating: boolean;
  error: string | null;
}

export const useShopifyCart = (): UseShopifyCartResult => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartService = new ShopifyCartService();

  const createCart = async (
    input: ShopifyCartInput
  ): Promise<ShopifyCartResponse> => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await cartService.createCartWithPrefill(input);

      if (!response.success) {
        setError(response.error || "Failed to create cart");
      }

      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      return {
        cartId: "",
        checkoutUrl: "",
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsCreating(false);
    }
  };

  const getProductVariant = async (url: string): Promise<string | null> => {
    try {
      setError(null);
      return await cartService.getProductVariantFromUrl(url);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get product variant";
      setError(errorMessage);
      return null;
    }
  };

  return {
    createCart,
    getProductVariant,
    isCreating,
    error,
  };
};
