// Shopify webhook types and interfaces
export interface ShopifyWebhookHeaders {
  "x-shopify-topic": string;
  "x-shopify-hmac-sha256": string;
  "x-shopify-shop-domain": string;
  "x-shopify-api-version": string;
  "x-shopify-webhook-id": string;
  "x-shopify-triggered-at": string;
  "x-shopify-event-id": string;
}

export interface ShopifyOrder {
  id: number;
  order_number: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  closed_at?: string;
  processed_at?: string;
  customer?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  billing_address?: ShopifyAddress;
  shipping_address?: ShopifyAddress;
  line_items: ShopifyLineItem[];
  financial_status:
    | "pending"
    | "authorized"
    | "partially_paid"
    | "paid"
    | "partially_refunded"
    | "refunded"
    | "voided";
  fulfillment_status?: "fulfilled" | "null" | "partial" | "restocked";
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  order_status_url?: string;
  note?: string;
  tags?: string;
  checkout_id?: number;
  fulfillments?: ShopifyFulfillment[];
}

export interface ShopifyAddress {
  first_name: string;
  last_name: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
  name?: string;
  company?: string;
  latitude?: number;
  longitude?: number;
  country_code: string;
  province_code: string;
}

export interface ShopifyLineItem {
  id: number;
  variant_id?: number;
  title: string;
  quantity: number;
  sku?: string;
  variant_title?: string;
  vendor?: string;
  fulfillment_service: string;
  product_id?: number;
  requires_shipping: boolean;
  taxable: boolean;
  gift_card: boolean;
  name: string;
  variant_inventory_management?: string;
  properties?: Array<{ name: string; value: string }>;
  product_exists: boolean;
  fulfillable_quantity: number;
  grams: number;
  price: string;
  total_discount: string;
  fulfillment_status?: string;
  price_set?: {
    shop_money: { amount: string; currency_code: string };
    presentment_money: { amount: string; currency_code: string };
  };
  total_discount_set?: {
    shop_money: { amount: string; currency_code: string };
    presentment_money: { amount: string; currency_code: string };
  };
}

export interface ShopifyFulfillment {
  id: number;
  order_id: number;
  status: "pending" | "open" | "success" | "cancelled" | "error" | "failure";
  created_at: string;
  service: string;
  updated_at: string;
  tracking_company?: string;
  shipment_status?:
    | "label_printed"
    | "label_purchased"
    | "attempted_delivery"
    | "ready_for_pickup"
    | "confirmed"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "failure";
  location_id?: number;
  line_items: ShopifyLineItem[];
  tracking_number?: string;
  tracking_numbers: string[];
  tracking_url?: string;
  tracking_urls: string[];
  receipt?: {
    testcase?: boolean;
    authorization?: string;
  };
  name: string;
  admin_graphql_api_id: string;
}

// Database types
export interface ShopifyOrderRecord {
  id: string;
  shopify_order_id: number;
  shopify_checkout_id?: string;
  listing_id: string;
  purchaser_wallet_address: string;
  creator_wallet_address: string;
  order_status: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
  financial_status?: string;
  fulfillment_status?: string;
  total_price: number;
  currency: string;
  shopify_customer_id?: number;
  shopify_customer_email?: string;
  shipping_address?: ShopifyAddress;
  line_items?: ShopifyLineItem[];
  webhook_events: WebhookEvent[];
  claimed_at?: string;
  claim_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface FulfillmentTrackingRecord {
  id: string;
  shopify_order_id: number;
  shopify_fulfillment_id?: number;
  tracking_company?: string;
  tracking_number?: string;
  tracking_url?: string;
  shipment_status: "pending" | "in_transit" | "delivered" | "exception";
  shipped_at?: string;
  estimated_delivery?: string;
  delivered_at?: string;
  location_updates: LocationUpdate[];
  created_at: string;
  updated_at: string;
}

export interface WebhookLogRecord {
  id: string;
  webhook_topic: string;
  shopify_order_id?: number;
  webhook_id?: string;
  event_id?: string;
  shop_domain?: string;
  payload: any;
  processed: boolean;
  error_message?: string;
  created_at: string;
}

export interface WebhookEvent {
  topic: string;
  event_id: string;
  timestamp: string;
  processed: boolean;
}

export interface LocationUpdate {
  timestamp: string;
  location: string;
  description: string;
  status: string;
}

// Webhook payload types for different events
export interface OrderCreatedPayload extends ShopifyOrder {}
export interface OrderPaidPayload extends ShopifyOrder {}
export interface OrderFulfilledPayload extends ShopifyOrder {}
export interface OrderCancelledPayload extends ShopifyOrder {}
export interface OrderUpdatedPayload extends ShopifyOrder {}

export interface FulfillmentCreatedPayload {
  id: number;
  order_id: number;
  status: string;
  created_at: string;
  service: string;
  updated_at: string;
  tracking_company?: string;
  shipment_status?: string;
  location_id?: number;
  line_items: ShopifyLineItem[];
  tracking_number?: string;
  tracking_numbers: string[];
  tracking_url?: string;
  tracking_urls: string[];
  receipt?: any;
  name: string;
}

export interface FulfillmentUpdatedPayload extends FulfillmentCreatedPayload {}

// Utility types for API responses
export interface OrderSummary {
  id: string;
  shopify_order_id: number;
  listing_title: string;
  order_status: string;
  total_price: number;
  currency: string;
  created_at: string;
  claimed_at?: string;
  claim_amount?: number;
  purchaser_wallet_address?: string;
  creator_wallet_address?: string;
  tracking_info?: {
    tracking_number: string;
    tracking_url: string;
    shipment_status: string;
  };
}

export interface OrderDetails extends ShopifyOrderRecord {
  listing: {
    id: string;
    title: string;
    description: string;
    price: number;
    image_url?: string;
  };
  fulfillment_tracking?: FulfillmentTrackingRecord[];
}

export type WebhookTopic =
  | "orders/create"
  | "orders/paid"
  | "orders/fulfilled"
  | "orders/cancelled"
  | "orders/updated"
  | "orders/partially_fulfilled"
  | "fulfillments/create"
  | "fulfillments/update";

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  orderId?: string;
  error?: string;
}
