-- ═══════════════════════════════════════════════════════════
-- Migration 0014 — Sprint 7b — Répondeur téléphonique IA
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Ajoute le système de téléphonie IA :
--   1. Configuration par tenant (personnalité, mode, features, numéros)
--   2. Audit log des appels (phone_calls)
--   3. Toggle "busy mode" live pour le service en rush
--
-- Demandé par retour terrain :
-- "Répondeur téléphonique pour quand on a pas le temps. Mais des fois
-- on peut décrocher quand on a le temps. Faut que ce soit ultra propre,
-- pas de latence, presque personne s'en rend compte".
--
-- Architecture :
--   - Twilio fournit le numéro de tel
--   - Vapi.ai gère la conversation IA (Gemini 2.5 Flash + ElevenLabs Turbo)
--   - Notre backend expose des tools que Vapi appelle (créer résa,
--     vérifier horaires, etc.)
--   - Routing : Twilio Studio Flow ring d'abord le staff X secondes,
--     puis fallback sur Vapi si pas de réponse
--   - Live busy toggle : staff peut forcer "IA prend tout" en 1 clic
--
-- HOW TO APPLY :
--   1. Open https://supabase.com/dashboard/project/rrvygmcpgmfqvelbpjjt/sql
--   2. Paste this entire file
--   3. Click "Run"
-- ═══════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────
-- 1. Configuration AI par tenant (sur restaurants)
-- ──────────────────────────────────────────────────────────

/* Le mode définit le comportement par défaut :
 *   'fallback' (défaut) : sonne staff X secondes puis IA si timeout
 *   'always'            : IA prend tous les appels (mode rush)
 *   'off'               : aucun appel n'est pris par l'IA
 */
alter table restaurants
  add column if not exists phone_ai_mode text default 'off'
  check (phone_ai_mode in ('off', 'fallback', 'always'));

/* Délai avant fallback IA en secondes (10/15/20/30 typique) */
alter table restaurants
  add column if not exists phone_ai_fallback_seconds integer default 20
  check (phone_ai_fallback_seconds between 5 and 60);

/* Numéro Twilio attribué au resto (ex "+33 1 XX XX XX XX").
 * Affiché à l'utilisateur, propagé sur les supports de communication. */
alter table restaurants
  add column if not exists twilio_phone_number text;

/* ID de l'assistant Vapi configuré pour ce resto.
 * Le patron crée son assistant dans le dashboard Vapi puis colle l'ID ici. */
alter table restaurants
  add column if not exists vapi_assistant_id text;

/* Personnalité de l'IA — JSONB pour flexibilité.
 *   {
 *     "voice_id": "charlotte_fr",     // ElevenLabs voice ID
 *     "voice_speed": 1.0,
 *     "language": "fr-FR",
 *     "formality": "tu" | "vous",
 *     "greeting": "Bonjour, vous êtes au [resto]. Que puis-je pour vous ?",
 *     "fallback_message": "Je vais transmettre votre message à l'équipe.",
 *     "personality_traits": ["chaleureux", "efficace", "professionnel"]
 *   }
 */
alter table restaurants
  add column if not exists phone_ai_personality jsonb default '{
    "language": "fr-FR",
    "formality": "vous",
    "voice_speed": 1.0
  }'::jsonb;

/* Capacités activées de l'IA — JSONB de booléens.
 *   {
 *     "take_reservations": true,    // peut créer une résa en autonomie
 *     "answer_hours": true,          // donne les horaires
 *     "describe_menu": true,         // décrit la carte
 *     "callback_message": true,      // prend un message si pas de réponse
 *     "transfer_to_human": false,    // peut transférer à un manager
 *     "say_address": true,
 *     "confirm_takeaway": false      // peut prendre commande à emporter
 *   }
 */
alter table restaurants
  add column if not exists phone_ai_features jsonb default '{
    "take_reservations": true,
    "answer_hours": true,
    "describe_menu": true,
    "callback_message": true,
    "transfer_to_human": false,
    "say_address": true,
    "confirm_takeaway": false
  }'::jsonb;

/* Toggle "live busy mode" — flippé en 1 clic par le staff pendant un rush.
 * Quand TRUE, force l'IA à prendre tous les appels (override le mode normal).
 * Reset auto à false après N heures (le serveur oublie souvent). */
alter table restaurants
  add column if not exists phone_busy_override_active boolean default false;

alter table restaurants
  add column if not exists phone_busy_override_until timestamptz;

-- ──────────────────────────────────────────────────────────
-- 2. Table phone_calls — audit log
-- ──────────────────────────────────────────────────────────
create table if not exists phone_calls (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,

  /* IDs externes pour cross-référencer avec Vapi/Twilio */
  vapi_call_id text,
  twilio_call_sid text,

  /* Caller info */
  caller_number text,
  caller_name text,                    /* si reconnu via customers */
  caller_customer_id uuid,

  /* Timing */
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,

  /* Routing */
  outcome text not null default 'unknown'
    check (outcome in (
      'staff_answered',                /* humain a décroché */
      'ai_answered',                    /* IA a pris l'appel */
      'voicemail',                      /* message déposé */
      'no_answer',                      /* personne, IA off */
      'transferred_to_human',           /* IA a tenté puis transféré */
      'unknown'
    )),

  /* Conversation */
  transcript text,                      /* texte de la conversation */
  audio_url text,                       /* lien vers l'enregistrement */

  /* Intent + actions */
  detected_intent text,                 /* "reservation" | "hours" | "menu" | "complaint" | "other" */
  reservation_id uuid,                  /* si une résa a été créée */
  callback_requested boolean default false,
  callback_phone text,
  callback_notes text,

  /* Coût */
  cost_cents integer,                   /* coût total Twilio + Vapi en cents */

  created_at timestamptz not null default now()
);

create index if not exists idx_phone_calls_restaurant on phone_calls (restaurant_id);
create index if not exists idx_phone_calls_started on phone_calls (restaurant_id, started_at desc);
create index if not exists idx_phone_calls_outcome on phone_calls (restaurant_id, outcome);
create index if not exists idx_phone_calls_callback on phone_calls (restaurant_id, callback_requested) where callback_requested = true;
create index if not exists idx_phone_calls_caller on phone_calls (restaurant_id, caller_number);

-- ──────────────────────────────────────────────────────────
-- 3. Verification queries
-- ──────────────────────────────────────────────────────────
-- select id, slug, phone_ai_mode, twilio_phone_number, vapi_assistant_id
-- from restaurants;
-- select count(*) from phone_calls;
