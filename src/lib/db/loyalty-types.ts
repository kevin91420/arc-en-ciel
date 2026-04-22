/**
 * LOYALTY TYPES — Tampons de fidélité
 */

export type LoyaltyTransactionType =
  | "stamp_earned"
  | "reward_claimed"
  | "stamp_adjusted"
  | "enrollment";

export interface LoyaltyCard {
  id: string;
  customer_id: string;
  card_number: string; // ex: "ACE-XYZ4"
  current_stamps: number;
  total_stamps_earned: number;
  rewards_claimed: number;
  last_stamp_at?: string | null;
  enrolled_at: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  card_id: string;
  type: LoyaltyTransactionType;
  amount: number;
  note?: string | null;
  staff_member?: string | null;
  created_at: string;
}

export interface LoyaltyConfig {
  id: number;
  stamps_required: number;
  reward_label: string;
  reward_description: string;
  welcome_message: string;
  brand_color: string;
  accent_color: string;
  active: boolean;
  updated_at: string;
}

/* Composite for UI: card + customer + recent transactions */
export interface LoyaltyCardFull extends LoyaltyCard {
  customer_name?: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  transactions?: LoyaltyTransaction[];
}

export interface EnrollLoyaltyPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
}

export interface LoyaltyStats {
  total_cards: number;
  active_cards: number; // visited in last 90 days
  total_stamps_given: number;
  total_rewards_claimed: number;
  avg_stamps_per_card: number;
  top_customers: Array<{
    card_number: string;
    customer_name: string;
    total_stamps: number;
  }>;
}
