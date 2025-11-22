-- Add purchase tracking columns to listings table
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available',
ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS purchaser_email TEXT,
ADD COLUMN IF NOT EXISTS shopify_product_id TEXT,
ADD COLUMN IF NOT EXISTS shopify_variant_id TEXT;

-- Add constraints for status
ALTER TABLE listings 
ADD CONSTRAINT listings_status_check 
CHECK (status IN ('available', 'sold', 'reserved', 'pending'));

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_shopify_product_id ON listings(shopify_product_id);

-- Update existing listings to have shopify_product_id (you may need to populate this based on your data)
-- Example: UPDATE listings SET shopify_product_id = 'your_product_id' WHERE id = 1;