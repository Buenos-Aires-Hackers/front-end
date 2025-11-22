-- Migration: Consolidate purchase requests into listings table
-- Created: 2024-12-28
-- Description: Merge purchase_requests functionality into listings for better UX and simpler schema

-- 1. Add missing fields from purchase_requests to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open' 
CHECK (status IN ('open', 'in_progress', 'fulfilled', 'cancelled'));

ALTER TABLE listings ADD COLUMN IF NOT EXISTS max_budget TEXT;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE listings ADD COLUMN IF NOT EXISTS deadline DATE;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure user_id exists (might already exist as created_by or similar)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- 2. Migrate existing purchase_requests data to listings
INSERT INTO listings (
  title,
  description,
  price,
  category,
  max_budget,
  priority,
  status,
  tags,
  deadline,
  notes,
  user_id,
  created_at,
  updated_at
)
SELECT 
  title,
  description,
  max_budget as price, -- Use max_budget as the initial price
  category,
  max_budget,
  priority,
  status,
  tags,
  deadline,
  notes,
  user_id,
  created_at,
  updated_at
FROM purchase_requests
WHERE NOT EXISTS (
  SELECT 1 FROM listings l 
  WHERE l.title = purchase_requests.title 
  AND l.user_id = purchase_requests.user_id
  AND l.created_at = purchase_requests.created_at
);

-- 3. Update indexes for new fields
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_priority ON listings(priority);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_deadline ON listings(deadline);

-- 4. Update updated_at trigger to include new fields
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure trigger exists for listings
DROP TRIGGER IF EXISTS update_listings_updated_at ON listings;
CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Add comment for clarity
COMMENT ON TABLE listings IS 'Unified table for all user requests/listings - both purchase requests and product listings';
COMMENT ON COLUMN listings.status IS 'Listing status: open (available), in_progress (being fulfilled), fulfilled (completed), cancelled';
COMMENT ON COLUMN listings.priority IS 'Request priority for purchase requests: low, medium, high, urgent';
COMMENT ON COLUMN listings.max_budget IS 'Maximum budget for purchase requests, can differ from price';

-- Note: Don't drop purchase_requests table yet, keep for safety
-- After confirming migration works, can drop with:
-- DROP TABLE purchase_requests;