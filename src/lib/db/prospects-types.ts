/**
 * PROSPECTS TYPES — Outbound prospection GOURMET PACK
 *
 * Distinct de pack_leads (inbound). Un "prospect" est un restaurant
 * qu'on contacte activement — scraping manuel, importé depuis
 * Apify / Phantombuster / saisie manuelle.
 */

export type ProspectStatus =
  | "new"
  | "queued"
  | "contacted"
  | "replied"
  | "meeting_booked"
  | "negotiating"
  | "won"
  | "lost"
  | "unreachable";

export type ProspectTemplateId =
  | "intro"
  | "follow_up_1"
  | "follow_up_2"
  | "last_chance";

export interface Prospect {
  id: string;
  restaurant_name: string;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  cuisine_type?: string | null;
  price_range?: string | null;

  status: ProspectStatus;
  emails_sent: number;
  last_email_at?: string | null;
  last_reply_at?: string | null;
  notes?: string | null;
  source: string;
  tags: string[];

  created_at: string;
  updated_at: string;
}

export interface ProspectEmail {
  id: string;
  prospect_id: string;
  template_id: ProspectTemplateId | string;
  subject: string;
  body: string;
  resend_id?: string | null;
  sent_at: string;
  opened_at?: string | null;
  replied_at?: string | null;
}

/**
 * Payload accepté par createProspect / createProspectsBatch.
 * Seul restaurant_name est strictement obligatoire.
 */
export interface CreateProspectPayload {
  restaurant_name: string;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  cuisine_type?: string | null;
  price_range?: string | null;
  notes?: string | null;
  source?: string;
  tags?: string[];
}

export interface ProspectStats {
  new: number;
  queued: number;
  contacted: number;
  replied: number;
  meeting_booked: number;
  negotiating: number;
  won: number;
  lost: number;
  unreachable: number;
  total: number;
  won_rate_percent: number;
}

export const PROSPECT_STATUSES: ProspectStatus[] = [
  "new",
  "queued",
  "contacted",
  "replied",
  "meeting_booked",
  "negotiating",
  "won",
  "lost",
  "unreachable",
];

export const PROSPECT_TEMPLATES: ProspectTemplateId[] = [
  "intro",
  "follow_up_1",
  "follow_up_2",
  "last_chance",
];
