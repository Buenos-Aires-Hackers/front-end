-- Migration: Add Order Tracking System
-- Created: 2024-12-28
-- Description: Add tables for Shopify order tracking, fulfillment, and webhook logging

-- 1. Create shopify_orders table to store Shopify order information
CREATE TABLE IF NOT EXISTS shopify_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shopify_order_id BIGINT UNIQUE NOT NULL,
  shopify_checkout_id TEXT,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  purchaser_wallet_address TEXT NOT NULL,
  creator_wallet_address TEXT NOT NULL,
  order_status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, fulfilled, cancelled, refunded
  financial_status TEXT, -- Shopify financial status (paid, pending, refunded, etc.)
  fulfillment_status TEXT, -- Shopify fulfillment status (fulfilled, partial, unfulfilled)
  total_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  shopify_customer_id BIGINT,
  shopify_customer_email TEXT,
  shipping_address JSONB, -- Store full shipping address from Shopify
  line_items JSONB, -- Store Shopify line items data
  webhook_events JSONB DEFAULT '[]'::jsonb, -- Track all webhook events received for this order
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create fulfillment_tracking table for shipping details
CREATE TABLE IF NOT EXISTS fulfillment_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shopify_order_id BIGINT REFERENCES shopify_orders(shopify_order_id) ON DELETE CASCADE,
  shopify_fulfillment_id BIGINT UNIQUE,
  tracking_company TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipment_status TEXT DEFAULT 'pending', -- pending, in_transit, delivered, exception
  shipped_at TIMESTAMP WITH TIME ZONE,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  location_updates JSONB DEFAULT '[]'::jsonb, -- Track delivery progress updates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create webhook_logs table for debugging and audit trail
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_topic TEXT NOT NULL, -- e.g., 'orders/create', 'orders/paid'
  shopify_order_id BIGINT,
  webhook_id TEXT, -- X-Shopify-Webhook-Id header
  event_id TEXT UNIQUE, -- X-Shopify-Event-Id header (prevents duplicates)
  shop_domain TEXT, -- X-Shopify-Shop-Domain header
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Add order tracking fields to existing listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_orders_shopify_order_id ON shopify_orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_listing_id ON shopify_orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_purchaser ON shopify_orders(purchaser_wallet_address);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_creator ON shopify_orders(creator_wallet_address);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_status ON shopify_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_created_at ON shopify_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_fulfillment_tracking_order_id ON fulfillment_tracking(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tracking_number ON fulfillment_tracking(tracking_number);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tracking_status ON fulfillment_tracking(shipment_status);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_topic ON webhook_logs(webhook_topic);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id ON webhook_logs(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to our new tables
DROP TRIGGER IF EXISTS update_shopify_orders_updated_at ON shopify_orders;
CREATE TRIGGER update_shopify_orders_updated_at 
  BEFORE UPDATE ON shopify_orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fulfillment_tracking_updated_at ON fulfillment_tracking;
CREATE TRIGGER update_fulfillment_tracking_updated_at 
  BEFORE UPDATE ON fulfillment_tracking 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE shopify_orders IS 'Stores Shopify order data linked to marketplace listings';
COMMENT ON TABLE fulfillment_tracking IS 'Tracks shipping and delivery status for orders';
COMMENT ON TABLE webhook_logs IS 'Logs all Shopify webhook events for debugging and audit';

COMMENT ON COLUMN shopify_orders.order_status IS 'Internal order status: pending, paid, fulfilled, cancelled, refunded';
COMMENT ON COLUMN shopify_orders.webhook_events IS 'Array of webhook events received for this order with timestamps';
COMMENT ON COLUMN fulfillment_tracking.location_updates IS 'Array of shipping location updates from tracking API';
COMMENT ON COLUMN webhook_logs.event_id IS 'Shopify Event ID used to prevent duplicate webhook processing';