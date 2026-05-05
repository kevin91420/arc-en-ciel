"use client";

/**
 * /admin/stock/recettes — Liste des plats avec leur statut recette.
 * Permet de cliquer sur un plat pour composer ou éditer sa recette.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import type { MenuItemRow } from "@/lib/db/menu-types";

interface ItemWithRecipe extends MenuItemRow {
  category_title?: string;
  category_icon?: string;
  has_recipe: boolean;
}

export default function RecettesListPage() {
  const [items, setItems] = useState<ItemWithRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stock?filter=all", {
        credentials: "include",
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/recipes", {
        credentials: "include",
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
    ]).then(([s, r]) => {
      const ids = new Set<string>(r?.menu_item_ids ?? []);
      const enriched = (s?.items ?? []).map((it: MenuItemRow & { category_title?: string; category_icon?: string }) => ({
        ...it,
        has_recipe: ids.has(it.id),
      }));
      setItems(enriched);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let res = items;
    if (filter === "with") res = res.filter((i) => i.has_recipe);
    if (filter === "without") res = res.filter((i) => !i.has_recipe);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      res = res.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category_title?.toLowerCase().includes(q)
      );
    }
    return res;
  }, [items, filter, search]);

  const withRecipe = items.filter((i) => i.has_recipe).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-brown-dark">
          Recettes
        </h1>
        <p className="text-sm text-brown-light/80 mt-1">
          Compose chaque plat en ingrédients. Une recette = la liste des
          ingrédients + leur quantité par portion. La consommation se fait
          automatiquement à chaque vente.
        </p>
        <p className="text-xs text-brown-light/70 mt-2">
          <strong className="text-brown-dark">{withRecipe}</strong> plat(s) avec
          recette · <strong>{items.length - withRecipe}</strong> sans recette
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un plat…"
          className="w-full h-11 px-4 rounded-xl border border-brown/15 bg-cream/40 text-sm placeholder:text-brown-light/50 focus:outline-none focus:border-gold transition"
        />
        <div className="flex gap-1.5">
          {(["all", "with", "without"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-bold transition active:scale-95 ${
                filter === f
                  ? "bg-brown text-cream"
                  : "bg-cream-dark text-brown hover:bg-cream-darker"
              }`}
            >
              {f === "all"
                ? `Tous (${items.length})`
                : f === "with"
                  ? `Avec recette (${withRecipe})`
                  : `Sans recette (${items.length - withRecipe})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-brown/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brown/15 p-12 text-center">
          <p className="text-4xl">📖</p>
          <p className="text-sm text-brown-light/70 mt-3">
            Aucun plat à afficher.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((it) => (
            <motion.li
              key={it.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Link
                href={`/admin/stock/recettes/${encodeURIComponent(it.id)}`}
                className={`block rounded-xl border bg-cream/30 p-3 sm:p-4 transition hover:border-gold/40 hover:bg-gold/5 ${
                  it.has_recipe ? "border-emerald-300/40" : "border-brown/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{it.category_icon ?? "🍽"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-bold text-sm text-brown-dark">
                        {it.name}
                      </span>
                      {it.has_recipe && (
                        <span className="text-[10px] uppercase font-bold text-emerald-700 px-1.5 py-0.5 bg-emerald-100 rounded">
                          ✓ Recette OK
                        </span>
                      )}
                      {!it.has_recipe && (
                        <span className="text-[10px] uppercase font-bold text-brown-light/70 px-1.5 py-0.5 bg-brown/5 rounded">
                          À composer
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brown-light/70 mt-0.5">
                      {it.category_title ?? "—"} · Vente{" "}
                      {formatCents(it.price_cents)}
                    </p>
                  </div>
                  <span className="text-brown-light/40">→</span>
                </div>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
