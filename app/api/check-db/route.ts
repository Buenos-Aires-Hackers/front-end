import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Let's try to add the columns using a different approach
    console.log("Attempting to add columns using INSERT/UPDATE approach...");

    // First, let's see the current structure
    const { data: currentListings, error: selectError } = await supabase
      .from("listings")
      .select("*")
      .limit(1);

    if (selectError) {
      throw new Error(`Failed to read listings: ${selectError.message}`);
    }

    const sampleListing = currentListings?.[0];
    const hasStatusColumn = sampleListing?.hasOwnProperty("status");

    return NextResponse.json({
      message: "Database structure check",
      currentColumns: Object.keys(sampleListing || {}),
      hasStatusColumn,
      sampleListing,
      note: hasStatusColumn
        ? "Status column already exists"
        : "Status column needs to be added manually in Supabase dashboard",
      manualMigrationSQL: `
-- Run this in Supabase SQL Editor:
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available',
ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS purchaser_email TEXT,
ADD COLUMN IF NOT EXISTS shopify_product_id TEXT,
ADD COLUMN IF NOT EXISTS shopify_variant_id TEXT;

-- Add constraints
ALTER TABLE listings 
ADD CONSTRAINT listings_status_check 
CHECK (status IN ('available', 'sold', 'reserved', 'pending'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_shopify_product_id ON listings(shopify_product_id);
      `,
    });
  } catch (error) {
    console.error("Database check failed:", error);
    return NextResponse.json(
      {
        error: "Database check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
