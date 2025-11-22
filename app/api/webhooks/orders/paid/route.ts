import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

interface OrderPaidWebhook {
  id: number;
  email: string;
  created_at: string;
  updated_at: string;
  number: number;
  note: string | null;
  token: string;
  gateway: string;
  test: boolean;
  total_price: string;
  subtotal_price: string;
  total_weight: number;
  total_tax: string;
  taxes_included: boolean;
  currency: string;
  financial_status: string;
  confirmed: boolean;
  total_discounts: string;
  buyer_accepts_marketing: boolean;
  name: string;
  referring_site: string | null;
  landing_site: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  user_id: number | null;
  location_id: number | null;
  source_identifier: string | null;
  source_url: string | null;
  processed_at: string;
  device_id: number | null;
  phone: string | null;
  customer_locale: string | null;
  app_id: number;
  browser_ip: string | null;
  landing_site_ref: string | null;
  order_number: number;
  discount_applications: any[];
  discount_codes: any[];
  note_attributes: any[];
  payment_gateway_names: string[];
  processing_method: string;
  checkout_id: number;
  source_name: string;
  fulfillment_status: string | null;
  tax_lines: any[];
  tags: string;
  contact_email: string;
  order_status_url: string;
  presentment_currency: string;
  total_line_items_price_set: any;
  total_discounts_set: any;
  total_shipping_price_set: any;
  subtotal_price_set: any;
  total_price_set: any;
  total_tax_set: any;
  line_items: any[];
  fulfillments: any[];
  refunds: any[];
  customer: any;
  billing_address: any;
  shipping_address: any;
  shipping_lines: any[];
}

// Webhook signature verification
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "base64"),
    Buffer.from(expectedSignature, "base64")
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-shopify-hmac-sha256");

    // Verify webhook signature (recommended for security)
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const orderData: OrderPaidWebhook = JSON.parse(body);

    console.log("Received orders/paid webhook:", {
      orderId: orderData.id,
      orderNumber: orderData.number,
      email: orderData.email,
      total: orderData.total_price,
      status: orderData.financial_status,
    });

    // Insert order into shopify_orders table
    const { error } = await supabase.from("shopify_orders").insert({
      shopify_order_id: orderData.id.toString(),
      order_number: orderData.number.toString(),
      customer_email: orderData.email,
      total_price: parseFloat(orderData.total_price),
      currency: orderData.currency,
      financial_status: orderData.financial_status,
      fulfillment_status: orderData.fulfillment_status,
      order_data: orderData,
      created_at: orderData.created_at,
      updated_at: orderData.updated_at,
    });

    if (error) {
      console.error("Error inserting order into database:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Update listing status if this order contains specific products
    if (orderData.line_items && orderData.line_items.length > 0) {
      for (const lineItem of orderData.line_items) {
        // Check if this line item corresponds to a listing
        // You may need to adjust this based on how you track listings
        const productId = lineItem.product_id?.toString();
        const variantId = lineItem.variant_id?.toString();

        if (productId) {
          // Update listing status to 'sold' or 'purchased'
          const { error: listingError } = await supabase
            .from("listings")
            .update({
              status: "sold",
              purchased_at: new Date().toISOString(),
              purchaser_email: orderData.email,
            })
            .eq("shopify_product_id", productId);

          if (listingError) {
            console.error("Error updating listing status:", listingError);
          } else {
            console.log(`Updated listing status for product ${productId}`);
          }
        }
      }
    }

    console.log("Successfully processed orders/paid webhook");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing orders/paid webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
