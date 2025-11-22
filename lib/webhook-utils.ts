import crypto from "crypto";
import { NextRequest } from "next/server";
import { supabase } from "./supabase";
import { ShopifyWebhookHeaders } from "./types/shopify-webhooks";
/**
 * Verify Shopify webhook HMAC signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload, "utf8");
    const calculatedSignature = hmac.digest("base64");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "base64"),
      Buffer.from(calculatedSignature, "base64")
    );
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

/**
 * Extract and normalize Shopify webhook headers
 */
export function extractWebhookHeaders(
  request: NextRequest
): ShopifyWebhookHeaders | null {
  try {
    const headers = {
      "x-shopify-topic":
        request.headers.get("x-shopify-topic") ||
        request.headers.get("X-Shopify-Topic"),
      "x-shopify-hmac-sha256":
        request.headers.get("x-shopify-hmac-sha256") ||
        request.headers.get("X-Shopify-Hmac-Sha256"),
      "x-shopify-shop-domain":
        request.headers.get("x-shopify-shop-domain") ||
        request.headers.get("X-Shopify-Shop-Domain"),
      "x-shopify-api-version":
        request.headers.get("x-shopify-api-version") ||
        request.headers.get("X-Shopify-API-Version"),
      "x-shopify-webhook-id":
        request.headers.get("x-shopify-webhook-id") ||
        request.headers.get("X-Shopify-Webhook-Id"),
      "x-shopify-triggered-at":
        request.headers.get("x-shopify-triggered-at") ||
        request.headers.get("X-Shopify-Triggered-At"),
      "x-shopify-event-id":
        request.headers.get("x-shopify-event-id") ||
        request.headers.get("X-Shopify-Event-Id"),
    };

    // Check if all required headers are present
    if (
      !headers["x-shopify-topic"] ||
      !headers["x-shopify-hmac-sha256"] ||
      !headers["x-shopify-event-id"]
    ) {
      return null;
    }

    return headers as ShopifyWebhookHeaders;
  } catch (error) {
    console.error("Error extracting webhook headers:", error);
    return null;
  }
}

/**
 * Check if webhook event has already been processed
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const supabaseInstance = supabase;

    const { data, error } = await supabaseInstance
      .from("webhook_logs")
      .select("id")
      .eq("event_id", eventId)
      .eq("processed", true)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking event processing status:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error checking if event is processed:", error);
    return false;
  }
}

/**
 * Log webhook event to database
 */
export async function logWebhookEvent(
  topic: string,
  headers: ShopifyWebhookHeaders,
  payload: any,
  processed: boolean = false,
  error?: string
) {
  try {
    const supabaseInstance = supabase;

    const webhookLog = {
      webhook_topic: topic,
      shopify_order_id: payload.id || null,
      webhook_id: headers["x-shopify-webhook-id"],
      event_id: headers["x-shopify-event-id"],
      shop_domain: headers["x-shopify-shop-domain"],
      payload,
      processed,
      error_message: error || null,
    };

    const { error: insertError } = await supabase
      .from("webhook_logs")
      .insert([webhookLog]);

    if (insertError) {
      console.error("Error logging webhook event:", insertError);
    }
  } catch (error) {
    console.error("Error logging webhook event:", error);
  }
}

/**
 * Mark webhook event as processed
 */
export async function markEventProcessed(eventId: string) {
  try {
    const supabaseInstance = supabase;

    const { error } = await supabaseInstance
      .from("webhook_logs")
      .update({ processed: true })
      .eq("event_id", eventId);

    if (error) {
      console.error("Error marking event as processed:", error);
    }
  } catch (error) {
    console.error("Error marking event as processed:", error);
  }
}

/**
 * Extract listing ID from order line items
 * Looks for custom properties or SKU that contains our listing ID
 */
export function extractListingIdFromOrder(order: any): string | null {
  try {
    // First check note_attributes (most reliable)
    if (order.note_attributes && Array.isArray(order.note_attributes)) {
      for (const attr of order.note_attributes) {
        if (attr.name === "listing_id" && attr.value) {
          console.log("Found listing_id in note_attributes:", attr.value);
          return attr.value.toString();
        }
      }
    }

    // Check line items for listing ID in properties or SKU
    for (const lineItem of order.line_items || []) {
      // Check custom properties
      if (lineItem.properties) {
        for (const prop of lineItem.properties) {
          if (prop.name === "listing_id" || prop.name === "Listing ID") {
            return prop.value;
          }
        }
      }

      // Check SKU (if we encode listing ID in SKU)
      if (lineItem.sku && lineItem.sku.startsWith("listing-")) {
        return lineItem.sku.replace("listing-", "");
      }

      // Check product title or variant title for encoded listing ID
      const title = lineItem.title || lineItem.name || "";
      const titleMatch = title.match(/\[listing:([a-f0-9-]+)\]/i);
      if (titleMatch) {
        return titleMatch[1];
      }
    }

    // Fallback: check order note for listing ID
    if (order.note) {
      const noteMatch = order.note.match(/listing[_-]?id:?\s*([a-f0-9-]+)/i);
      if (noteMatch) {
        return noteMatch[1];
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting listing ID from order:", error);
    return null;
  }
}

/**
 * Get creator wallet address from listing
 */
export async function getCreatorFromListing(
  listingId: string
): Promise<string | null> {
  try {
    const supabaseInstance = supabase;

    // Join listings with users to get the creator's wallet address
    const { data, error } = await supabaseInstance
      .from("listings")
      .select(
        `
        id,
        ordered_by_user_id,
        users!listings_ordered_by_user_id_fkey (
          wallet_address
        )
      `
      )
      .eq("id", listingId)
      .single();

    if (error) {
      console.error("Error fetching creator from listing:", error);
      return null;
    }

    // Handle case where listing has no creator assigned
    if (!data?.users) {
      console.warn(`No creator found for listing ${listingId}`);
      return "unknown"; // Return placeholder for now
    }

    const walletAddress = (data.users as any)?.wallet_address;
    console.log(
      `Found creator wallet for listing ${listingId}:`,
      walletAddress
    );
    return walletAddress || "unknown";
  } catch (error) {
    console.error("Error getting creator from listing:", error);
    return null;
  }
}

/**
 * Extract purchaser wallet address from order
 * This might come from checkout attributes or customer metadata
 */
export function extractPurchaserFromOrder(order: any): string | null {
  try {
    // First check note_attributes (most reliable)
    if (order.note_attributes && Array.isArray(order.note_attributes)) {
      for (const attr of order.note_attributes) {
        if (attr.name === "wallet_address" && attr.value) {
          console.log("Found wallet_address in note_attributes:", attr.value);
          return attr.value;
        }
      }
    }

    // Check order note for wallet address
    if (order.note) {
      const walletMatch = order.note.match(
        /wallet[_-]?address:?\s*(0x[a-fA-F0-9]+)/i
      );
      if (walletMatch) {
        return walletMatch[1];
      }
    }

    // Check customer metadata or tags
    if (order.customer?.note) {
      const customerWalletMatch = order.customer.note.match(
        /wallet:?\s*(0x[a-fA-F0-9]+)/i
      );
      if (customerWalletMatch) {
        return customerWalletMatch[1];
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting purchaser from order:", error);
    return null;
  }
}

/**
 * Validate webhook request
 */
export async function validateWebhookRequest(
  request: NextRequest,
  payload: string
): Promise<{
  valid: boolean;
  headers?: ShopifyWebhookHeaders;
  error?: string;
}> {
  const headers = extractWebhookHeaders(request);
  if (!headers) {
    return { valid: false, error: "Missing required webhook headers" };
  }

  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // If no secret configured, skip signature validation but still return headers
    console.warn(
      "Webhook secret not configured - skipping signature validation"
    );
    return { valid: true, headers, error: "Webhook secret not configured" };
  }

  const isSignatureValid = verifyWebhookSignature(
    payload,
    headers["x-shopify-hmac-sha256"],
    webhookSecret
  );

  if (!isSignatureValid) {
    return { valid: false, error: "Invalid webhook signature" };
  }

  // Check if event has already been processed
  const alreadyProcessed = await isEventProcessed(
    headers["x-shopify-event-id"]
  );
  if (alreadyProcessed) {
    return { valid: false, error: "Event already processed" };
  }

  return { valid: true, headers };
}
