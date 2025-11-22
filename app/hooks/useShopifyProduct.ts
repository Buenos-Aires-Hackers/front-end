'use client';

import { useMutation } from '@tanstack/react-query';
import { SHOPIFY_API_VERSION, ShopifyProductPayload, parseShopifyProductUrl } from '@/lib/shopify';

interface ShopifyProductResponse {
  data?: {
    productByHandle?: {
      id: string;
      title: string;
      description: string;
      images: { edges: { node: { url: string } }[] };
      variants: {
        edges: {
          node: {
            id: string;
            price: {
              amount: string;
              currencyCode: string;
            };
          };
        }[];
      };
    };
  };
  errors?: { message: string }[];
}

const PRODUCT_QUERY = `#graphql
  query GetProduct($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      description
      images(first: 1) {
        edges {
          node {
            url
          }
        }
      }
      variants(first: 1) {
        edges {
          node {
            id
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

export const useShopifyProduct = () => {
  const {
    mutateAsync: fetchProduct,
    isPending,
    error,
  } = useMutation({
    mutationFn: async (productUrl: string): Promise<ShopifyProductPayload> => {
      const { domain, handle } = parseShopifyProductUrl(productUrl);
      const token = process.env.NEXT_PUBLIC_STOREFRONT_API;

      if (!token) {
        throw new Error('Missing Shopify Storefront API token');
      }

      const response = await fetch(`https://${domain}/api/${SHOPIFY_API_VERSION}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': token,
        },
        body: JSON.stringify({
          query: PRODUCT_QUERY,
          variables: { handle },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch product from Shopify');
      }

      const payload = (await response.json()) as ShopifyProductResponse;

      if (payload.errors?.length) {
        throw new Error(payload.errors[0].message || 'Shopify query error');
      }

      const product = payload.data?.productByHandle;

      if (!product) {
        throw new Error('Product not found on Shopify');
      }

      const firstImage = product.images.edges[0]?.node?.url;
      const firstVariant = product.variants.edges[0]?.node;

      return {
        shopifyId: product.id,
        title: product.title,
        description: product.description,
        imageUrl: firstImage,
        handle,
        domain,
        variantPrice: firstVariant?.price?.amount,
        currencyCode: firstVariant?.price?.currencyCode,
      };
    },
  });

  return {
    fetchProduct,
    isFetchingProduct: isPending,
    fetchProductError: error as Error | null,
  };
};
