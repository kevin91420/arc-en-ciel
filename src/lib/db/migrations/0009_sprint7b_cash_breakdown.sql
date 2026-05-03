-- ═══════════════════════════════════════════════════════════
-- Migration 0009 — Sprint 7b — Comptage caisse détaillé
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Ajoute le détail des dénominations (billets + pièces) au
-- moment de la fermeture de caisse.
--
-- Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
-- "Pour la caisse voir le nombre d'argent dedans : 1 billet de 100€,
-- 20 pièces de 1€, etc."
--
-- Format JSONB attendu :
--   {
--     "b500": 0,  "b200": 0,  "b100": 1,  "b50": 4,  "b20": 8,
--     "b10": 12,  "b5": 7,
--     "c200": 15, "c100": 20, "c050": 18, "c020": 25,
--     "c010": 30, "c005": 12, "c002": 8,  "c001": 4
--   }
-- où b = billet (en €), c = pièce (en centimes — c050 = 0,50€).
--
-- HOW TO APPLY :
--   1. Open https://supabase.com/dashboard/project/rrvygmcpgmfqvelbpjjt/sql
--   2. Paste this entire file in a new query
--   3. Click "Run"
--   4. Verify : select id, cash_breakdown from cash_sessions limit 5;
-- ═══════════════════════════════════════════════════════════

alter table cash_sessions
  add column if not exists cash_breakdown jsonb;

-- Verification
-- select id, opening_amount_cents, expected_cash_cents, actual_cash_cents,
--        cash_breakdown
-- from cash_sessions
-- order by opened_at desc
-- limit 5;
