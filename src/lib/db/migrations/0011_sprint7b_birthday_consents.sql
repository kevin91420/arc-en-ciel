-- ═══════════════════════════════════════════════════════════
-- Migration 0011 — Sprint 7b — Anniversaires + consentements RGPD
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Ajoute les flags de consentement RGPD aux customers + un
-- index sur le mois de naissance pour les requêtes "anniversaires du mois".
--
-- Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
-- "Quand un client s'inscrit à la fidélité, lui demander son année de
-- naissance pour envoyer une notif anniversaire — fidéliser".
--
-- Champs ajoutés :
--   - birthday_consent       boolean   (le client accepte d'être contacté
--                                       pour son anniversaire — opt-in)
--   - marketing_consent      boolean   (général : newsletter, promo)
--   - sms_consent            boolean   (SMS spécifiquement, séparé)
--
-- HOW TO APPLY :
--   1. Open https://supabase.com/dashboard/project/rrvygmcpgmfqvelbpjjt/sql
--   2. Paste this entire file
--   3. Click "Run"
-- ═══════════════════════════════════════════════════════════

alter table customers
  add column if not exists birthday_consent boolean default false;

alter table customers
  add column if not exists marketing_consent boolean default false;

alter table customers
  add column if not exists sms_consent boolean default false;

/* Index fonctionnel pour query "anniversaires du mois X" — recherche
 * uniquement le MOIS et le JOUR (l'année change). Très rapide même
 * avec 100k customers. */
create index if not exists idx_customers_birthday_month_day
  on customers (
    extract(month from birthday),
    extract(day from birthday),
    restaurant_id
  )
  where birthday is not null and birthday_consent = true;

/* Verification :
 * select count(*) from customers where birthday is not null;
 * select extract(month from birthday) as m, count(*) from customers
 *   where birthday is not null group by m order by m;
 */
