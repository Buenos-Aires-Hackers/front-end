export const SHOPIFY_API_VERSION = "2024-01";

export interface ShopifyProductPayload {
  shopifyId: string;
  title: string;
  description: string;
  imageUrl?: string;
  handle: string;
  domain: string;
  variantPrice?: string;
  currencyCode?: string;
}

export interface ShopifyUrlParts {
  domain: string;
  handle: string;
}

export const parseShopifyProductUrl = (input: string): ShopifyUrlParts => {
  try {
    const url = new URL(input.trim());
    const segments = url.pathname.split("/").filter(Boolean);
    const productsIndex = segments.findIndex((segment) => segment === "products");

    if (productsIndex === -1 || !segments[productsIndex + 1]) {
      throw new Error("Unable to locate product handle in URL");
    }

    const handle = segments[productsIndex + 1];
    return { domain: url.hostname, handle };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Invalid product URL provided"
    );
  }
};

export const humanizeShopifyHandle = (handle: string): string => {
  return handle
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
    .trim();
};
