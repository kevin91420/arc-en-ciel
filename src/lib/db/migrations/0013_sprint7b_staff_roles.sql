-- ═══════════════════════════════════════════════════════════
-- Migration 0013 — Sprint 7b — Permissions multi-niveaux
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Sécurise la colonne staff_members.role pour le système
-- de permissions multi-niveaux (manager / serveur / chef).
--
-- La contrainte CHECK existe déjà depuis pos-schema.sql ligne 10. Cette
-- migration est défensive : elle réapplique le check et ajoute des
-- garanties supplémentaires (NOT NULL + default 'server' pour les
-- rows historiques où role aurait pu être null par accident).
--
-- Demandé par retour terrain (boulangerie utilisatrice d'Angelo) :
-- "Lors de l'ouverture du logiciel avoir un code de sécurité superviseur
-- et serveur, avec des options différentes selon le rôle".
--
-- HOW TO APPLY :
--   1. Open https://supabase.com/dashboard/project/rrvygmcpgmfqvelbpjjt/sql
--   2. Paste this entire file
--   3. Click "Run"
-- ═══════════════════════════════════════════════════════════

-- 1. Backfill : tous les staff sans rôle valide deviennent 'server'
update staff_members
  set role = 'server'
  where role is null or role not in ('manager', 'server', 'chef');

-- 2. Force NOT NULL + default
alter table staff_members
  alter column role set default 'server',
  alter column role set not null;

-- 3. Réapplique la contrainte CHECK (idempotent via DO block)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'staff_members_role_check'
  ) then
    alter table staff_members
      add constraint staff_members_role_check
      check (role in ('manager', 'server', 'chef'));
  end if;
end $$;

-- 4. Index sur role pour les queries "qui sont les managers"
create index if not exists idx_staff_members_role
  on staff_members (restaurant_id, role)
  where active = true;

-- Verification
-- select role, count(*) from staff_members group by role;
