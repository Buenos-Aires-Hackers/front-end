-- Add claim tracking fields to shopify_orders table
-- This allows tracking when fulfilled orders are claimed by purchasers

ALTER TABLE shopify_orders 
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS claim_amount DECIMAL(10,2);

-- Add comment for documentation
COMMENT ON COLUMN shopify_orders.claimed_at IS 'When the fulfilled order was claimed by the purchaser';
COMMENT ON COLUMN shopify_orders.claim_amount IS 'Amount claimed by the purchaser';