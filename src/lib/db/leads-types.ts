/**
 * LEADS TYPES — Pipeline commercial GOURMET PACK
 */

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "won"
  | "lost";

export interface PackLead {
  id: string;
  restaurant_name: string;
  contact_name: string;
  email: string;
  phone?: string | null;
  interest?: string | null;
  status: LeadStatus;
  source: string;
  notes?: string | null;
  next_followup?: string | null; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface CreateLeadPayload {
  restaurant_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  interest?: string;
  source?: string;
}
