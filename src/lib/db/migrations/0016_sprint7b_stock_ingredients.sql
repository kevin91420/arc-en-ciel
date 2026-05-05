-- ════════════════════════════════════════════════════════════════
-- Sprint 7b — Stock Niveau 2 : ingrédients + recettes (BOM)
-- ════════════════════════════════════════════════════════════════
-- Bascule du tracking par menu_item (Niveau 1, naïf) au tracking par
-- ingrédient avec recettes (Niveau 2, modèle resto pro).
--
-- Concept :
--   - Une "Pizza Margherita" n'a pas de stock — ce qui a un stock,
--     c'est Mozzarella, Tomate, Pâte, Basilic.
--   - Une recette définit la quantité par portion : 1 Margherita =
--     150g mozza + 80g sauce + 1 pâte + 5g basilic.
--   - À chaque fire d'order item, on consomme les ingrédients selon
--     la recette. Coût matière calculé → marge réelle.
--   - Restock fournisseur (Métro, Promocash, local) → trace + valeur.
--
-- Idempotent : tout en `if not exists` / `do $$ ... exception`.
-- ════════════════════════════════════════════════════════════════

/* ──────────────────────────────────────────────────────────
   Table ingredients
   Le vrai stock physique en cuisine.
   ────────────────────────────────────────────────────────── */
create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,

  -- Identité
  name text not null,
  -- Unité de gestion : "g" / "kg" / "ml" / "L" / "unité" / "tranche" / "botte"
  unit text not null,
  -- Catégorie pour grouper (Frais, Sec, Surgelé, Boisson, Conso)
  category text default 'Autre',

  -- Stock
  -- Quantity en numeric pour gérer 0.250 kg ou 1.5 L
  stock_quantity numeric(12, 3) not null default 0,
  stock_threshold_low numeric(12, 3) not null default 0,
  -- Quantité optimale après restock (target d'inventaire)
  stock_target numeric(12, 3),

  -- Valeur / coût
  -- Coût d'achat moyen par unité, en centimes
  -- Ex: 1500 = 15.00€/kg si unit = "kg"
  cost_per_unit_cents integer not null default 0,

  -- Fournisseur
  supplier_name text,
  supplier_ref text,

  -- Meta
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ingredients_restaurant
  on ingredients(restaurant_id);
create index if not exists idx_ingredients_active
  on ingredients(restaurant_id, active);
create index if not exists idx_ingredients_name
  on ingredients(restaurant_id, lower(name));

/* ──────────────────────────────────────────────────────────
   Table menu_item_recipes
   Composition d'un menu_item en ingrédients.
   ────────────────────────────────────────────────────────── */
create table if not exists menu_item_recipes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,

  -- Le plat (textuel car menu_item.id est text dans la base actuelle)
  menu_item_id text not null,

  -- L'ingrédient consommé
  ingredient_id uuid not null references ingredients(id) on delete cascade,

  -- Quantité par portion vendue (dans l'unité de l'ingrédient)
  -- Ex : ingredient.unit = "g", quantity_per_serving = 150 → 150g par plat
  quantity_per_serving numeric(12, 3) not null,

  -- Optionnel : variant_id si la recette diffère par variant (ex: Margherita 30cm vs 40cm)
  variant_id uuid,

  notes text,
  created_at timestamptz not null default now(),

  unique (restaurant_id, menu_item_id, ingredient_id, variant_id)
);

create index if not exists idx_recipes_menu_item
  on menu_item_recipes(restaurant_id, menu_item_id);
create index if not exists idx_recipes_ingredient
  on menu_item_recipes(ingredient_id);

/* ──────────────────────────────────────────────────────────
   Table ingredient_movements
   Audit trail des entrées/sorties d'ingrédients.
   ────────────────────────────────────────────────────────── */
create table if not exists ingredient_movements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,

  -- Type de mouvement
  -- restock     : livraison fournisseur (delta > 0)
  -- consume     : consommé via recette (delta < 0)
  -- loss        : perte / casse / périmé (delta < 0)
  -- adjustment  : correction manuelle après inventaire
  -- inventory   : snapshot d'inventaire physique
  kind text not null check (kind in ('restock', 'consume', 'loss', 'adjustment', 'inventory')),

  -- Variation (positive ou négative)
  delta numeric(12, 3) not null,
  -- Snapshot du stock après le mouvement (pour audit)
  quantity_after numeric(12, 3) not null,

  -- Coût snapshot pour ce mouvement (utile sur restock pour suivre l'évolution prix)
  cost_per_unit_cents integer,

  -- Liens optionnels pour traçabilité
  order_id text,
  menu_item_id text,
  created_by_staff_id uuid references staff_members(id) on delete set null,

  -- Justificatif livraison (BL fournisseur)
  reference text,
  notes text,

  created_at timestamptz not null default now()
);

create index if not exists idx_ingr_mvt_ingredient
  on ingredient_movements(ingredient_id, created_at desc);
create index if not exists idx_ingr_mvt_restaurant_kind
  on ingredient_movements(restaurant_id, kind, created_at desc);
create index if not exists idx_ingr_mvt_order
  on ingredient_movements(order_id);

/* ──────────────────────────────────────────────────────────
   Trigger updated_at sur ingredients
   ────────────────────────────────────────────────────────── */
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_ingredients_updated_at'
  ) then
    create trigger trg_ingredients_updated_at
    before update on ingredients
    for each row execute function trigger_set_updated_at();
  end if;
exception
  when undefined_function then
    -- trigger_set_updated_at() pas dispo dans ce schéma — on ignore,
    -- le client mettra à jour updated_at manuellement.
    null;
end $$;

/* ──────────────────────────────────────────────────────────
   Vérification
   ────────────────────────────────────────────────────────── */
select
  (select count(*) from ingredients) as nb_ingredients,
  (select count(*) from menu_item_recipes) as nb_recipes,
  (select count(*) from ingredient_movements) as nb_movements;
