export interface ShopifyCartInput {
  productVariantId: string;
  quantity: number;
  email?: string;
  phone?: string;
  countryCode?: string;
  listingId?: string; // For order tracking
  purchaserWallet?: string; // For order tracking
  deliveryAddress?: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
  };
}

export interface ShopifyCartResponse {
  cartId: string;
  checkoutUrl: string;
  success: boolean;
  error?: string;
}

export class ShopifyCartService {
  private storeName: string;
  private storefrontAccessToken: string;
  private apiVersion: string = "2025-01";

  constructor() {
    this.storeName = process.env.NEXT_PUBLIC_SHOPIFY_STORE_NAME!;
    this.storefrontAccessToken = process.env.NEXT_PUBLIC_STOREFRONT_API!;

    if (!this.storeName || !this.storefrontAccessToken) {
      throw new Error(
        "Shopify configuration is missing. Please check environment variables."
      );
    }
  }

  private get endpoint(): string {
    return `https://${this.storeName}.myshopify.com/api/${this.apiVersion}/graphql.json`;
  }

  private async executeGraphQL(
    query: string,
    variables: any = {}
  ): Promise<any> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": this.storefrontAccessToken,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Shopify API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(
        `GraphQL error: ${data.errors.map((e: any) => e.message).join(", ")}`
      );
    }

    return data.data;
  }

  async createCartWithPrefill(
    input: ShopifyCartInput
  ): Promise<ShopifyCartResponse> {
    const mutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
            buyerIdentity {
              email
              phone
              countryCode
              preferences {
                delivery {
                  deliveryMethod
                }
              }
            }
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
            }
          }
          userErrors {
            field
            message
          }
          warnings {
            code
            message
          }
        }
      }
    `;

    try {
      // Build the cart input
      const cartInput: any = {
        lines: [
          {
            merchandiseId: input.productVariantId,
            quantity: input.quantity,
          },
        ],
      };

      // Add checkout attributes with address information and tracking metadata
      const attributes: Array<{ key: string; value: string }> = [];

      // Add delivery address attributes
      if (input.deliveryAddress) {
        attributes.push(
          {
            key: "delivery_first_name",
            value: input.deliveryAddress.firstName || "",
          },
          {
            key: "delivery_last_name",
            value: input.deliveryAddress.lastName || "",
          },
          {
            key: "delivery_address1",
            value: input.deliveryAddress.address1 || "",
          },
          {
            key: "delivery_address2",
            value: input.deliveryAddress.address2 || "",
          },
          { key: "delivery_city", value: input.deliveryAddress.city || "" },
          {
            key: "delivery_province",
            value: input.deliveryAddress.province || "",
          },
          {
            key: "delivery_country",
            value: input.deliveryAddress.country || "",
          },
          { key: "delivery_zip", value: input.deliveryAddress.zip || "" }
        );
      }

      // Add order tracking metadata
      if (input.listingId) {
        attributes.push({
          key: "listing_id",
          value: input.listingId,
        });
      }

      if (input.purchaserWallet) {
        attributes.push({
          key: "wallet_address",
          value: input.purchaserWallet,
        });
      }

      // Create comprehensive note for order tracking
      let noteValue = "";
      if (input.deliveryAddress) {
        noteValue += `Delivery Address: ${input.deliveryAddress.firstName} ${input.deliveryAddress.lastName}, ${input.deliveryAddress.address1}, ${input.deliveryAddress.city}, ${input.deliveryAddress.province} ${input.deliveryAddress.zip}, ${input.deliveryAddress.country}`;
      }
      if (input.listingId) {
        noteValue += noteValue
          ? ` | Listing ID: ${input.listingId}`
          : `Listing ID: ${input.listingId}`;
      }
      if (input.purchaserWallet) {
        noteValue += noteValue
          ? ` | Wallet: ${input.purchaserWallet}`
          : `Wallet: ${input.purchaserWallet}`;
      }

      if (noteValue) {
        attributes.push({
          key: "_note",
          value: noteValue,
        });
      }

      if (attributes.length > 0) {
        cartInput.attributes = attributes.filter((attr) => attr.value);
      }

      // Add buyer identity if provided
      if (input.email || input.phone || input.countryCode) {
        cartInput.buyerIdentity = {};

        if (input.email) {
          cartInput.buyerIdentity.email = input.email;
        }

        if (input.phone) {
          cartInput.buyerIdentity.phone = input.phone;
        }

        if (input.countryCode) {
          cartInput.buyerIdentity.countryCode = input.countryCode;
        }

        // Set shipping delivery preference
        cartInput.buyerIdentity.preferences = {
          delivery: {
            deliveryMethod: ["SHIPPING"],
          },
        };
      }

      const data = await this.executeGraphQL(mutation, { input: cartInput });

      if (data.cartCreate.userErrors.length > 0) {
        return {
          cartId: "",
          checkoutUrl: "",
          success: false,
          error: data.cartCreate.userErrors
            .map((e: any) => e.message)
            .join(", "),
        };
      }

      const cart = data.cartCreate.cart;

      // Try to enhance checkout URL with address parameters
      let enhancedCheckoutUrl = cart.checkoutUrl;
      if (input.deliveryAddress) {
        enhancedCheckoutUrl = this.addAddressParamsToCheckoutUrl(
          cart.checkoutUrl,
          input.deliveryAddress
        );
      }

      return {
        cartId: cart.id,
        checkoutUrl: enhancedCheckoutUrl,
        success: true,
      };
    } catch (error) {
      return {
        cartId: "",
        checkoutUrl: "",
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private addAddressParamsToCheckoutUrl(
    checkoutUrl: string,
    address: NonNullable<ShopifyCartInput["deliveryAddress"]>
  ): string {
    try {
      const url = new URL(checkoutUrl);

      // Add shipping address parameters that Shopify might recognize
      if (address.firstName)
        url.searchParams.set(
          "checkout[shipping_address][first_name]",
          address.firstName
        );
      if (address.lastName)
        url.searchParams.set(
          "checkout[shipping_address][last_name]",
          address.lastName
        );
      if (address.address1)
        url.searchParams.set(
          "checkout[shipping_address][address1]",
          address.address1
        );
      if (address.address2)
        url.searchParams.set(
          "checkout[shipping_address][address2]",
          address.address2
        );
      if (address.city)
        url.searchParams.set("checkout[shipping_address][city]", address.city);
      if (address.province)
        url.searchParams.set(
          "checkout[shipping_address][province]",
          address.province
        );
      if (address.country)
        url.searchParams.set(
          "checkout[shipping_address][country]",
          address.country
        );
      if (address.zip)
        url.searchParams.set("checkout[shipping_address][zip]", address.zip);

      return url.toString();
    } catch (error) {
      console.warn("Failed to add address parameters to checkout URL:", error);
      return checkoutUrl;
    }
  }

  // Method to get product variant ID from product URL
  async getProductVariantFromUrl(productUrl: string): Promise<string | null> {
    try {
      // Extract handle from URL (e.g., https://store.myshopify.com/products/product-handle)
      const urlParts = productUrl.split("/");
      const handleIndex = urlParts.findIndex((part) => part === "products");

      if (handleIndex === -1 || handleIndex === urlParts.length - 1) {
        throw new Error("Invalid product URL format");
      }

      const handle = urlParts[handleIndex + 1];

      // Query to get product variants by handle
      const query = `
        query getProduct($handle: String!) {
          productByHandle(handle: $handle) {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  availableForSale
                }
              }
            }
          }
        }
      `;

      const data = await this.executeGraphQL(query, { handle });

      if (!data.productByHandle) {
        return null;
      }

      const variants = data.productByHandle.variants.edges;
      if (variants.length === 0) {
        return null;
      }

      return variants[0].node.id;
    } catch (error) {
      console.error("Error getting product variant:", error);
      return null;
    }
  }
}
