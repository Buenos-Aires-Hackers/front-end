import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on the unified listings table structure
export interface Listing {
  id: number;
  title: string;
  description?: string;
  price: string;
  tags?: string[];
  ordered_by?: string;
  url?: string;
  original_price?: string;
  image_url?: string;
  badge?: string;
  rating?: number;
  reviews?: number;
  category?: string;
  in_stock?: boolean;
  // New fields from purchase requests consolidation
  status?: "open" | "in_progress" | "fulfilled" | "cancelled";
  max_budget?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  deadline?: string;
  notes?: string;
  user_id?: string;
  purchased_by?: string; // Wallet address of who fulfilled the order
  purchased_at?: string;
  purchaser_email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  wallet_address: string;
  email?: string;
  username?: string;
  full_name?: string;
  phone?: string;
  roles?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface UserAddress {
  id: string;
  user_id: string;
  address_type?: string;
  is_default?: boolean;
  full_name?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  user_id?: string;
  buyer_id?: string;
  fulfiller_id?: string;
  listing_id?: number;
  status?: string;
  order_type?: string;
  quantity?: number;
  unit_price?: string;
  total_amount?: string;
  crypto_payment_amount?: string;
  fulfiller_reward_amount?: string;
  fulfiller_claimed?: boolean;
  shipping_address_id?: string;
  billing_address_id?: string;
  tracking_number?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseRequest {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  category?: string;
  max_budget?: string;
  priority?: string;
  status?: string;
  tags?: string[];
  deadline?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountOrder extends Order {
  listing?: Listing | null;
}

export interface AccountData {
  user: User | null;
  addresses: UserAddress[];
  orders: AccountOrder[];
  listings: Listing[]; // User's purchase requests/listings
}
