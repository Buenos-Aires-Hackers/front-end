import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log(
      "Running database migration to add purchase tracking columns..."
    );

    // Add the new columns to listings table
    const migrationSQL = `
      -- Add purchase tracking columns to listings table
      ALTER TABLE listings 
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available',
      ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS purchaser_email TEXT,
      ADD COLUMN IF NOT EXISTS shopify_product_id TEXT,
      ADD COLUMN IF NOT EXISTS shopify_variant_id TEXT;

      -- Add constraints for status
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'listings_status_check'
        ) THEN
          ALTER TABLE listings 
          ADD CONSTRAINT listings_status_check 
          CHECK (status IN ('available', 'sold', 'reserved', 'pending'));
        END IF;
      END $$;

      -- Add indexes for efficient querying
      CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
      CREATE INDEX IF NOT EXISTS idx_listings_shopify_product_id ON listings(shopify_product_id);
    `;

    // Execute the migration
    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      // Try alternative approach using individual queries
      console.log("RPC approach failed, trying individual queries...");

      const queries = [
        "ALTER TABLE listings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available'",
        "ALTER TABLE listings ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ",
        "ALTER TABLE listings ADD COLUMN IF NOT EXISTS purchaser_email TEXT",
        "ALTER TABLE listings ADD COLUMN IF NOT EXISTS shopify_product_id TEXT",
        "ALTER TABLE listings ADD COLUMN IF NOT EXISTS shopify_variant_id TEXT",
      ];

      for (const query of queries) {
        try {
          await supabase.rpc("exec_sql", { sql: query });
        } catch (queryError) {
          console.log(`Query failed (may already exist): ${query}`, queryError);
        }
      }
    }

    // Verify the migration worked
    const { data: testQuery, error: testError } = await supabase
      .from("listings")
      .select("id, title, status, shopify_product_id")
      .limit(1);

    if (testError) {
      throw new Error(`Migration verification failed: ${testError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "Database migration completed successfully",
      verification: {
        querySuccessful: !testError,
        sampleData: testQuery?.[0] || null,
      },
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        message: error instanceof Error ? error.message : "Unknown error",
        note: "You may need to run this migration manually in Supabase dashboard",
      },
      { status: 500 }
    );
  }
}
