-- ═══════════════════════════════════════════════════════════
-- Migration 0008 — Sprint 7b — Identité société (legal fields)
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Ajoute les champs juridiques manquants à `restaurant_settings` :
--
--   - naf_code         text   (Code NAF/APE — ex 5610A)
--   - legal_form       text   (Forme juridique — SARL, SAS, EURL, AE, etc.)
--   - capital_social   text   (Capital social en € — texte pour gérer "1 €
--                              symbolique" ou "10 000 €", etc.)
--   - rcs              text   (RCS — ex "RCS Évry B 123 456 789")
--   - cgv_url          text   (URL des CGV publiques pour mention sur tickets)
--
-- Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
-- "Pour contrôle URSSAF, il faut SIRET, code NAF, n° TVA, code postal, etc."
--
-- HOW TO APPLY :
--   1. Open https://supabase.com/dashboard/project/rrvygmcpgmfqvelbpjjt/sql
--   2. Paste this entire file in a new query
--   3. Click "Run"
--   4. Vérifier : select naf_code, legal_form from restaurant_settings;
-- ═══════════════════════════════════════════════════════════

alter table restaurant_settings
  add column if not exists naf_code text;

alter table restaurant_settings
  add column if not exists legal_form text;

alter table restaurant_settings
  add column if not exists capital_social text;

alter table restaurant_settings
  add column if not exists rcs text;

alter table restaurant_settings
  add column if not exists cgv_url text;

-- Verification (commenter après run)
-- select id, restaurant_id, legal_name, siret, vat_number, naf_code, legal_form
-- from restaurant_settings;
