"use client";

/**
 * /admin/stock/recettes/[itemId] — Composer la recette d'un plat.
 *
 * Affiche :
 *   - Infos plat (nom, prix de vente, marge calculée)
 *   - Liste des ingrédients courants de la recette (éditables)
 *   - Picker pour ajouter un ingrédient
 *   - Cost breakdown live (coût matière, marge €, marge %)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { formatCents } from "@/lib/format";
import type {
  IngredientRow,
  IngredientUnit,
  MenuItemRecipeWithIngredient,
  RecipeCostBreakdown,
} from "@/lib/db/ingredient-types";
import type { MenuItemRow } from "@/lib/db/menu-types";

interface RecipeLine {
  ingredient_id: string;
  quantity_per_serving: number;
  /* Snapshot pour affichage */
  name: string;
  unit: IngredientUnit;
  cost_per_unit_cents: number;
  stock_quantity: number;
}

export default function RecipeEditorPage() {
  const params = useParams();
  const router = useRouter();
  const menuItemId = decodeURIComponent(String(params.itemId ?? ""));

  const [menuItem, setMenuItem] = useState<MenuItemRow | null>(null);
  const [allIngredients, setAllIngredients] = useState<IngredientRow[]>([]);
  const [lines, setLines] = useState<RecipeLine[]>([]);
  const [breakdown, setBreakdown] = useState<RecipeCostBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [stockRes, ingRes, recipeRes] = await Promise.all([
      fetch("/api/admin/stock?filter=all", {
        credentials: "include",
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/ingredients", {
        credentials: "include",
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/admin/recipes/${encodeURIComponent(menuItemId)}`, {
        credentials: "include",
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
    ]);

    const items = (stockRes?.items ?? []) as MenuItemRow[];
    const found = items.find((i) => i.id === menuItemId);
    setMenuItem(found ?? null);

    setAllIngredients(ingRes?.ingredients ?? []);

    const recipe = (recipeRes?.recipe ?? []) as MenuItemRecipeWithIngredient[];
    setLines(
      recipe.map((r) => ({
        ingredient_id: r.ingredient_id,
        quantity_per_serving: Number(r.quantity_per_serving),
        name: r.ingredient_name,
        unit: r.ingredient_unit,
        cost_per_unit_cents: r.ingredient_cost_per_unit_cents,
        stock_quantity: r.ingredient_stock_quantity,
      }))
    );

    setBreakdown(recipeRes?.breakdown ?? null);
    setLoading(false);
  }, [menuItemId]);

  useEffect(() => {
    if (!menuItemId) return;
    fetchAll();
  }, [fetchAll, menuItemId]);

  /* ─────────────────── Computed ─────────────────── */

  const liveCost = useMemo(() => {
    return lines.reduce(
      (acc, l) =>
        acc + Math.round(l.quantity_per_serving * l.cost_per_unit_cents),
      0
    );
  }, [lines]);

  const margin = (menuItem?.price_cents ?? 0) - liveCost;
  const marginPct =
    menuItem && menuItem.price_cents > 0
      ? Math.round((margin / menuItem.price_cents) * 100)
      : 0;

  const availableIngredients = useMemo(() => {
    const usedIds = new Set(lines.map((l) => l.ingredient_id));
    return allIngredients.filter((i) => !usedIds.has(i.id));
  }, [allIngredients, lines]);

  const filteredAvailable = useMemo(() => {
    if (!search.trim()) return availableIngredients;
    const q = search.trim().toLowerCase();
    return availableIngredients.filter((i) =>
      i.name.toLowerCase().includes(q)
    );
  }, [availableIngredients, search]);

  /* ─────────────────── Actions ─────────────────── */

  function addIngredient(ing: IngredientRow) {
    setLines((prev) => [
      ...prev,
      {
        ingredient_id: ing.id,
        quantity_per_serving: 1,
        name: ing.name,
        unit: ing.unit,
        cost_per_unit_cents: ing.cost_per_unit_cents,
        stock_quantity: Number(ing.stock_quantity),
      },
    ]);
    setSearch("");
    setPickerOpen(false);
  }

  function updateLine(index: number, qty: number) {
    setLines((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, quantity_per_serving: Math.max(0, qty) } : l
      )
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/recipes/${encodeURIComponent(menuItemId)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ingredients: lines.map((l) => ({
              ingredient_id: l.ingredient_id,
              quantity_per_serving: l.quantity_per_serving,
            })),
          }),
        }
      );
      if (!res.ok) throw new Error("Erreur sauvegarde");
      const data = await res.json();
      setBreakdown(data.breakdown ?? null);
      setSavedAt(new Date().toISOString());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  /* ─────────────────── Render ─────────────────── */

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 bg-brown/5 rounded-2xl animate-pulse" />
        <div className="h-48 bg-brown/5 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!menuItem) {
    return (
      <div className="rounded-2xl border border-dashed border-brown/15 p-12 text-center">
        <p className="text-4xl">❓</p>
        <p className="text-sm text-brown-light/70 mt-3">Plat introuvable.</p>
        <Link
          href="/admin/stock/recettes"
          className="mt-4 inline-flex items-center justify-center h-10 px-4 rounded-lg bg-brown text-cream text-sm font-bold"
        >
          ← Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <Link
          href="/admin/stock/recettes"
          className="text-xs font-bold text-brown-light hover:text-brown-dark"
        >
          ← Toutes les recettes
        </Link>
        {savedAt && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full"
          >
            ✓ Enregistré
          </motion.span>
        )}
      </div>

      {/* HEADER PLAT */}
      <div className="rounded-2xl border border-brown/10 bg-cream/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-brown-light/70 font-bold">
              Composer la recette
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl text-brown-dark mt-1">
              {menuItem.name}
            </h1>
            <p className="text-xs text-brown-light/70 mt-1">
              Prix de vente :{" "}
              <strong>{formatCents(menuItem.price_cents)}</strong>
            </p>
          </div>
        </div>

        {/* Cost breakdown live */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <Stat label="Coût matière" value={formatCents(liveCost)} />
          <Stat
            label="Marge €"
            value={formatCents(margin)}
            tone={margin >= 0 ? "emerald" : "red"}
          />
          <Stat
            label="Marge %"
            value={`${marginPct}%`}
            tone={marginPct >= 60 ? "emerald" : marginPct >= 30 ? "amber" : "red"}
          />
        </div>
      </div>

      {/* RECETTE */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg text-brown-dark">
            Ingrédients par portion
          </h2>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center justify-center h-9 px-3 rounded-lg bg-gold hover:bg-gold-dark text-brown-dark text-xs font-bold transition active:scale-95"
          >
            + Ajouter
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brown/15 p-8 text-center">
            <p className="text-3xl">🥬</p>
            <p className="text-sm text-brown-light/70 mt-3">
              Aucun ingrédient.
            </p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-4 inline-flex items-center justify-center h-10 px-4 rounded-lg bg-brown hover:bg-brown-dark text-cream text-sm font-bold transition active:scale-95"
            >
              Ajouter le premier ingrédient
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((l, idx) => {
              const lineCost = Math.round(
                l.quantity_per_serving * l.cost_per_unit_cents
              );
              const enough = l.stock_quantity >= l.quantity_per_serving;
              return (
                <motion.li
                  key={l.ingredient_id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-brown/10 bg-cream/30 p-3 sm:p-4 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-brown-dark">
                      {l.name}
                    </p>
                    <p className="text-[11px] text-brown-light/70 mt-0.5">
                      Coût {formatCents(l.cost_per_unit_cents)}/{l.unit} · Stock{" "}
                      <span
                        className={enough ? "text-emerald-700" : "text-red-dark"}
                      >
                        {l.stock_quantity.toLocaleString("fr-FR")} {l.unit}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={l.quantity_per_serving}
                      onChange={(e) =>
                        updateLine(idx, Number(e.target.value))
                      }
                      className="w-20 h-10 px-2 rounded-lg border border-brown/15 bg-white text-sm text-right font-mono focus:outline-none focus:border-gold"
                    />
                    <span className="text-xs text-brown-light/70 w-10">
                      {l.unit}
                    </span>
                  </div>
                  <div className="text-right w-20 hidden sm:block">
                    <p className="text-xs font-bold text-brown-dark">
                      {formatCents(lineCost)}
                    </p>
                    <p className="text-[10px] text-brown-light/60">par plat</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="h-8 w-8 rounded-lg text-brown-light/60 hover:text-red-dark hover:bg-red/5 transition"
                    aria-label="Retirer"
                  >
                    ×
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      {/* SAVE */}
      <div className="sticky bottom-4 z-10">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-brown hover:bg-brown-dark text-cream font-bold text-sm shadow-lg shadow-brown-dark/10 transition active:scale-[0.98] disabled:opacity-40"
        >
          {saving ? "Enregistrement…" : "💾 Enregistrer la recette"}
        </button>
      </div>

      {/* PICKER MODAL */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPickerOpen(false)}
            className="fixed inset-0 z-50 bg-brown-dark/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-cream rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="p-5 border-b border-brown/10">
                <h3 className="font-[family-name:var(--font-display)] text-lg text-brown-dark">
                  Ajouter un ingrédient
                </h3>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  placeholder="Rechercher…"
                  className="mt-3 w-full h-10 px-3 rounded-lg border border-brown/15 bg-white text-sm focus:outline-none focus:border-gold"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {filteredAvailable.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-3xl">🔍</p>
                    <p className="text-xs text-brown-light/70 mt-2">
                      {availableIngredients.length === 0
                        ? "Tous les ingrédients sont déjà dans la recette."
                        : "Aucun résultat."}
                    </p>
                    <Link
                      href="/admin/stock/ingredients"
                      className="mt-4 inline-flex items-center justify-center h-9 px-3 rounded-lg bg-brown text-cream text-xs font-bold"
                    >
                      Créer un nouvel ingrédient
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {filteredAvailable.map((ing) => (
                      <li key={ing.id}>
                        <button
                          type="button"
                          onClick={() => addIngredient(ing)}
                          className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-brown/5 transition text-left"
                        >
                          <div>
                            <p className="font-bold text-sm text-brown-dark">
                              {ing.name}
                            </p>
                            <p className="text-[11px] text-brown-light/70">
                              {ing.category} ·{" "}
                              {Number(ing.stock_quantity).toLocaleString(
                                "fr-FR"
                              )}{" "}
                              {ing.unit} dispo
                            </p>
                          </div>
                          <span className="text-xs font-bold text-gold">+</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="p-4 border-t border-brown/10">
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="w-full h-10 rounded-lg border border-brown/15 text-brown text-sm font-bold hover:bg-brown/5"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "red";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : tone === "red"
          ? "text-red-dark"
          : "text-brown-dark";
  return (
    <div className="rounded-lg bg-white border border-brown/10 p-3">
      <p className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold">
        {label}
      </p>
      <p className={`font-[family-name:var(--font-display)] text-xl mt-0.5 ${color}`}>
        {value}
      </p>
    </div>
  );
}
