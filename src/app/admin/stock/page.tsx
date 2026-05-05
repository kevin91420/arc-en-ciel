"use client";

/**
 * /admin/stock — Vue d'ensemble du stock (Niveau 1 + Niveau 2 consolidés).
 *
 * 4 cards stat principales :
 *   - Valeur totale du stock (ingrédients × coût)
 *   - Ingrédients en alerte
 *   - Ingrédients en rupture
 *   - Plats avec recette définie
 *
 * Sections :
 *   - Alertes consolidées (top 10 ingrédients en bas)
 *   - Quick actions (ajouter ingrédient, composer recette)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import type { IngredientRow, IngredientStats } from "@/lib/db/ingredient-types";

interface Niv1Stats {
  tracked_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_value_cents: number;
}

interface Niv2Data {
  ingredients: IngredientRow[];
  stats: IngredientStats;
}

export default function StockOverviewPage() {
  const [niv1, setNiv1] = useState<Niv1Stats | null>(null);
  const [niv2, setNiv2] = useState<Niv2Data | null>(null);
  const [recipesCount, setRecipesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      fetch("/api/admin/stock?filter=all", {
        credentials: "include",
        cache: "no-store",
        signal: ac.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/admin/ingredients?filter=alerts", {
        credentials: "include",
        cache: "no-store",
        signal: ac.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/admin/recipes", {
        credentials: "include",
        cache: "no-store",
        signal: ac.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([s, ing, rec]) => {
      if (s?.stats) setNiv1(s.stats);
      if (ing?.stats) setNiv2(ing);
      if (rec?.menu_item_ids) setRecipesCount(rec.menu_item_ids.length);
      setLoading(false);
    });
    return () => ac.abort();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-brown/5 rounded-2xl animate-pulse" />
        <div className="h-48 bg-brown/5 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const totalValue = (niv2?.stats.total_value_cents ?? 0);
  const alerts = (niv2?.stats.low_stock_count ?? 0) + (niv2?.stats.out_of_stock_count ?? 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <p className="text-xs uppercase tracking-widest text-brown-light/70 font-bold">
          Inventaire en temps réel · Stock
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-brown-dark mt-1">
          Vue d&apos;ensemble
        </h1>
        <p className="text-sm text-brown-light/80 mt-1">
          Le vrai stock se gère par <strong>ingrédient</strong>. Une recette dit
          combien de chaque ingrédient pour 1 plat → la consommation est
          décomptée automatiquement à chaque commande.
        </p>
      </div>

      {/* HERO CTA — si pas encore d'ingrédients */}
      {niv2 && niv2.stats.total_ingredients === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/5 via-cream to-gold/5 p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="text-5xl">🥬</div>
            <div className="flex-1">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-brown-dark mb-2">
                Démarrer ton inventaire
              </h2>
              <p className="text-sm text-brown-light/80 leading-relaxed mb-4">
                Liste tes ingrédients (mozzarella, olives, pâtes…), donne leur
                stock actuel et leur seuil d&apos;alerte. Ensuite, compose les
                recettes de tes plats. À chaque vente, le stock se met à jour
                tout seul.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/stock/ingredients"
                  className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-gold hover:bg-gold-dark text-brown-dark font-bold text-sm transition active:scale-95"
                >
                  Ajouter mes premiers ingrédients →
                </Link>
                <Link
                  href="/admin/stock/recettes"
                  className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-cream-dark hover:bg-cream-darker text-brown font-semibold text-sm transition active:scale-95"
                >
                  Composer les recettes
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon="💰"
          label="Valeur stock"
          value={formatCents(totalValue)}
          sub={`${niv2?.stats.active_ingredients ?? 0} ingrédients actifs`}
          tone="gold"
        />
        <StatCard
          icon="⚠"
          label="En alerte"
          value={String(niv2?.stats.low_stock_count ?? 0)}
          sub={
            niv2?.stats.low_stock_count
              ? "Sous le seuil bas"
              : "Tout au-dessus du seuil"
          }
          tone={alerts > 0 ? "amber" : "neutral"}
        />
        <StatCard
          icon="🚫"
          label="En rupture"
          value={String(niv2?.stats.out_of_stock_count ?? 0)}
          sub={niv2?.stats.out_of_stock_count ? "À réappro vite" : "Aucune rupture"}
          tone={(niv2?.stats.out_of_stock_count ?? 0) > 0 ? "red" : "neutral"}
        />
        <StatCard
          icon="📖"
          label="Recettes"
          value={String(recipesCount)}
          sub="Plats avec composition"
          tone="neutral"
        />
      </div>

      {/* ALERTES CONSOLIDÉES */}
      {niv2 && niv2.ingredients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-brown/10 bg-cream/50 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg text-brown-dark">
                Ingrédients à réapprovisionner
              </h2>
              <p className="text-xs text-brown-light/70 mt-0.5">
                Stock ≤ seuil bas
              </p>
            </div>
            <Link
              href="/admin/stock/ingredients?filter=alerts"
              className="text-xs font-bold text-brown hover:text-brown-dark"
            >
              Voir tout →
            </Link>
          </div>

          <ul className="divide-y divide-brown/5">
            {niv2.ingredients.slice(0, 10).map((i) => {
              const isOut = Number(i.stock_quantity) === 0;
              return (
                <li
                  key={i.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-brown-dark truncate">
                        {i.name}
                      </span>
                      <span className="text-[11px] uppercase tracking-wider text-brown-light/60">
                        {i.category}
                      </span>
                    </div>
                    <p className="text-xs text-brown-light/70 mt-0.5">
                      {i.supplier_name ? `Fournisseur : ${i.supplier_name}` : "Pas de fournisseur"}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <span
                      className={`text-sm font-bold ${
                        isOut ? "text-red-dark" : "text-amber-700"
                      }`}
                    >
                      {Number(i.stock_quantity).toLocaleString("fr-FR")} {i.unit}
                    </span>
                    <p className="text-[11px] text-brown-light/60">
                      seuil {Number(i.stock_threshold_low).toLocaleString("fr-FR")} {i.unit}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}

      {/* INFO NIVEAU 1 fallback */}
      {niv1 && niv1.tracked_items > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-brown/10 bg-cream/30 p-4 text-xs text-brown-light/80"
        >
          <strong className="text-brown-dark">{niv1.tracked_items} plats</strong> sont
          aussi suivis directement (Niveau 1). Utile pour les boissons en bouteille
          ou les plats déjà préparés.{" "}
          <Link href="/admin/stock/items" className="font-bold text-brown hover:underline">
            Voir →
          </Link>
        </motion.div>
      )}
    </div>
  );
}

/* ─────────────────── Components ─────────────────── */

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  tone: "gold" | "amber" | "red" | "neutral";
}) {
  const toneClass =
    tone === "gold"
      ? "border-gold/30 bg-gold/5"
      : tone === "amber"
        ? "border-amber-400/40 bg-amber-50"
        : tone === "red"
          ? "border-red/30 bg-red/5"
          : "border-brown/10 bg-cream/30";
  const valColor =
    tone === "red"
      ? "text-red-dark"
      : tone === "amber"
        ? "text-amber-700"
        : "text-brown-dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 ${toneClass}`}
    >
      <div className="flex items-start justify-between">
        <div className="text-2xl">{icon}</div>
      </div>
      <p className="text-[11px] uppercase tracking-wider text-brown-light/70 font-bold mt-2">
        {label}
      </p>
      <p
        className={`font-[family-name:var(--font-display)] text-2xl ${valColor} mt-0.5`}
      >
        {value}
      </p>
      <p className="text-[11px] text-brown-light/60 mt-1">{sub}</p>
    </motion.div>
  );
}
