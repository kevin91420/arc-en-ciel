/**
 * PHONE TYPES — Téléphonie IA + audit log (Sprint 7b QW#10).
 *
 * Architecture :
 *   Twilio (numéro de tel) → Vapi.ai (LLM + voice) → notre backend (tools)
 *
 * Vapi gère la couche conversationnelle (Gemini 2.5 Flash + ElevenLabs Turbo).
 * Notre rôle : fournir les outils que l'IA peut appeler (créer résa, etc.)
 * + log les appels + UI de configuration.
 */

export type PhoneAIMode =
  /** L'IA ne prend aucun appel — uniquement humains */
  | "off"
  /** Sonne staff X secondes, puis IA en fallback si timeout */
  | "fallback"
  /** Tous les appels vont à l'IA (mode rush) */
  | "always";

/**
 * Personnalité de l'IA — paramètres comportementaux et vocaux.
 */
export interface PhoneAIPersonality {
  /** Langue dominante : fr-FR / en-US / etc. */
  language?: string;
  /** Formalité : "tu" pour bistro décontracté, "vous" pour gastro */
  formality?: "tu" | "vous";
  /** Vitesse de la voix (0.7–1.3, 1.0 = normal) */
  voice_speed?: number;
  /** Voice ID ElevenLabs (Charlotte FR par défaut) */
  voice_id?: string;
  /** Phrase d'accueil personnalisée (template avec {{restaurant}}) */
  greeting?: string;
  /** Message de fin */
  closing?: string;
  /** Traits à incarner : ["chaleureux", "efficace", "professionnel"] */
  personality_traits?: string[];
}

/**
 * Features autorisées pour l'IA.
 * Chaque toggle débloque un comportement / outil que l'IA peut utiliser.
 */
export interface PhoneAIFeatures {
  /** L'IA peut créer une réservation directement */
  take_reservations?: boolean;
  /** L'IA répond aux horaires d'ouverture */
  answer_hours?: boolean;
  /** L'IA peut décrire la carte (résumé, signatures) */
  describe_menu?: boolean;
  /** L'IA propose de prendre un message si demande hors-scope */
  callback_message?: boolean;
  /** L'IA peut transférer à un humain manager (si dispo) */
  transfer_to_human?: boolean;
  /** L'IA donne l'adresse + accès */
  say_address?: boolean;
  /** L'IA peut prendre une commande à emporter (avancé) */
  confirm_takeaway?: boolean;
}

/**
 * Config complète de la téléphonie IA pour un tenant.
 */
export interface PhoneAIConfig {
  mode: PhoneAIMode;
  fallback_seconds: number;            // 5–60
  twilio_phone_number: string | null;  // ex "+33155555555"
  vapi_assistant_id: string | null;    // ID dans le dashboard Vapi
  personality: PhoneAIPersonality;
  features: PhoneAIFeatures;
  /** Toggle live (1-click busy mode) */
  busy_override_active: boolean;
  busy_override_until: string | null;  // ISO datetime auto-reset
}

/**
 * Outcome d'un appel — utilisé pour les stats.
 */
export type PhoneCallOutcome =
  | "staff_answered"
  | "ai_answered"
  | "voicemail"
  | "no_answer"
  | "transferred_to_human"
  | "unknown";

/**
 * Intent détecté par l'IA pendant l'appel.
 */
export type PhoneCallIntent =
  | "reservation"
  | "hours"
  | "menu"
  | "address"
  | "complaint"
  | "callback"
  | "other";

/**
 * Row DB d'un appel téléphonique.
 */
export interface PhoneCallRow {
  id: string;
  restaurant_id: string;
  vapi_call_id: string | null;
  twilio_call_sid: string | null;

  caller_number: string | null;
  caller_name: string | null;
  caller_customer_id: string | null;

  started_at: string;                   // ISO
  ended_at: string | null;
  duration_seconds: number | null;

  outcome: PhoneCallOutcome;

  transcript: string | null;
  audio_url: string | null;

  detected_intent: PhoneCallIntent | null;
  reservation_id: string | null;
  callback_requested: boolean;
  callback_phone: string | null;
  callback_notes: string | null;

  cost_cents: number | null;

  created_at: string;
}

/**
 * Stats globales sur les appels (page historique + dashboard).
 */
export interface PhoneCallStats {
  total_count: number;
  ai_answered_count: number;
  staff_answered_count: number;
  callback_pending_count: number;
  reservations_via_ai_count: number;
  total_duration_seconds: number;
  total_cost_cents: number;
  /** Période sur laquelle les stats sont calculées */
  period_label: string;
}

/**
 * Métadonnées des modes pour UI.
 */
export const PHONE_AI_MODE_META: Record<
  PhoneAIMode,
  { label: string; icon: string; description: string }
> = {
  off: {
    label: "Désactivé",
    icon: "📞",
    description: "L'IA ne prend aucun appel. Tous les appels sonnent dans le resto.",
  },
  fallback: {
    label: "Fallback intelligent",
    icon: "⚡",
    description:
      "Le tel sonne d'abord chez vous. L'IA prend l'appel uniquement si personne ne décroche après le délai configuré.",
  },
  always: {
    label: "IA d'abord",
    icon: "🤖",
    description:
      "Mode rush : l'IA répond directement à tous les appels. À utiliser pendant un service chargé.",
  },
};

/**
 * Métadonnées des features pour UI.
 */
export const PHONE_AI_FEATURES_META: Array<{
  key: keyof PhoneAIFeatures;
  label: string;
  description: string;
  icon: string;
  default_on: boolean;
}> = [
  {
    key: "take_reservations",
    label: "Prise de réservation",
    description:
      "L'IA peut créer une résa directement (date, heure, nb couverts, nom).",
    icon: "📅",
    default_on: true,
  },
  {
    key: "answer_hours",
    label: "Horaires",
    description: "Donne les horaires d'ouverture en fonction du jour demandé.",
    icon: "🕐",
    default_on: true,
  },
  {
    key: "say_address",
    label: "Adresse & accès",
    description: "Donne l'adresse, parking, transports, accès PMR.",
    icon: "📍",
    default_on: true,
  },
  {
    key: "describe_menu",
    label: "Présentation carte",
    description:
      "Résume la carte, mentionne les signatures, allergies, prix moyens.",
    icon: "📖",
    default_on: true,
  },
  {
    key: "callback_message",
    label: "Prise de message",
    description:
      "Si la demande sort du scope, l'IA propose de transmettre un message.",
    icon: "📝",
    default_on: true,
  },
  {
    key: "transfer_to_human",
    label: "Transfert humain",
    description:
      "L'IA peut transférer à un manager (avancé — à activer prudemment).",
    icon: "👤",
    default_on: false,
  },
  {
    key: "confirm_takeaway",
    label: "Commande à emporter",
    description:
      "L'IA peut prendre une commande complète à emporter (avancé).",
    icon: "🥡",
    default_on: false,
  },
];
