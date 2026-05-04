"use client";

/**
 * /admin/stock — Console de gestion du stock par item.
 *
 * Sprint 7b QW#12. Niveau 1 : tracking par menu_item (pas par ingrédient).
 *
 * Demandé par retour terrain (boulangerie patronne d'Angelo) :
 * "Stock plus précis avec nombre d'item, qui marche en directe.
 * Mettre en place un message pour les ruptures proches".
 *
 * Sections :
 *   - 4 stat cards (items suivis, alerte, rupture, valeur stock)
 *   - Filtres pills (tous / suivis / alertes)
 *   - Liste des items avec stock + quick actions (+/- / restock modal)
 *   - Modal "Configurer le tracking" pour activer/désactiver par item
 *   - Modal "Mouvement de stock" pour restock / perte / ajustement
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import type {
  MenuItemRow,
  MenuItemWithStockInfo,
  StockMovementKind,
} from "@/lib/db/menu-types";

interface StockStats {
  tracked_items: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_value_cents: number;
}

type FilterMode = "all" | "tracked" | "alerts";

const MOVEMENT_LABELS: Record<StockMovementKind, { label: string; icon: string }> = {
  restock: { label: "Ré-appro", icon: "📦" },
  loss: { label: "Perte / casse", icon: "💔" },
  adjustment: { label: "Ajustement", icon: "✏" },
  sale: { label: "Vente", icon: "🍽" },
  return: { label: "Annulation", icon: "↩" },
};

export default function StockAdminPage() {
  const [items, setItems] = useState<MenuItemWithStockInfo[]>([]);
  const [stats, setStats] = useState<StockStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [movementModal, setMovementModal] = useState<{
    item: MenuItemWithStockInfo;
    kind: "restock" | "loss" | "adjustment";
  } | null>(null);
  const [configModal, setConfigModal] = useState<MenuItemWithStockInfo | null>(
    null
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/stock?filter=${filter}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Stock load failed");
      const data = (await res.json()) as {
        items: MenuItemWithStockInfo[];
        stats: StockStats;
      };
      setItems(data.items);
      setStats(data.stats);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.category_title?.toLowerCase().includes(q) ?? false)
    );
  }, [items, search]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Inventaire en temps réel
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Stock
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          Suivi des quantités par plat. Auto-décrément à l&apos;envoi cuisine,
          recrédit en cas d&apos;annulation. Ré-appro et alertes seuil bas.
        </p>
      </motion.div>

      {/* Stats */}
      {stats && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          <StatCard
            label="Plats suivis"
            value={String(stats.tracked_items)}
            tone="brown"
            emphasis
          />
          <StatCard
            label="Alerte seuil bas"
            value={String(stats.low_stock_count)}
            tone="amber"
            urgent={stats.low_stock_count > 0}
          />
          <StatCard
            label="En rupture"
            value={String(stats.out_of_stock_count)}
            tone="red"
            urgent={stats.out_of_stock_count > 0}
          />
          <StatCard
            label="Valeur stock"
            value={formatCents(stats.total_value_cents)}
            tone="gold"
            mono
          />
        </motion.section>
      )}

      {/* Toolbar */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-5 flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="Tous"
          />
          <FilterPill
            active={filter === "tracked"}
            onClick={() => setFilter("tracked")}
            label="Suivis"
            count={stats?.tracked_items}
          />
          <FilterPill
            active={filter === "alerts"}
            onClick={() => setFilter("alerts")}
            label="⚠ Alertes"
            count={
              (stats?.low_stock_count ?? 0) + (stats?.out_of_stock_count ?? 0)
            }
            urgent
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un plat…"
            className="h-10 w-56 px-3 rounded-lg bg-cream border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
      </motion.section>

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red-dark text-sm p-3">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-brown-light text-sm py-12 text-center">
          Chargement…
        </p>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-terracotta/30 bg-white-warm/30">
          <div className="text-5xl mb-3" aria-hidden>
            📦
          </div>
          <p className="text-brown-light max-w-md mx-auto px-4">
            {filter === "alerts"
              ? "Aucun plat en alerte. Tout va bien 🎉"
              : filter === "tracked"
                ? "Aucun plat n'a le suivi de stock activé. Active-le sur les plats où c'est utile (ex : pizzas spéciales, plats de saison)."
                : search.trim()
                  ? "Aucun plat ne correspond à ta recherche."
                  : "Aucun plat dans la carte."}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="space-y-2">
          {filtered.map((it) => (
            <StockItemRow
              key={it.id}
              item={it}
              onRestock={() => setMovementModal({ item: it, kind: "restock" })}
              onLoss={() => setMovementModal({ item: it, kind: "loss" })}
              onAdjust={() =>
                setMovementModal({ item: it, kind: "adjustment" })
              }
              onConfigure={() => setConfigModal(it)}
            />
          ))}
        </ul>
      )}

      {/* Modals */}
      <AnimatePresence>
        {movementModal && (
          <MovementModal
            item={movementModal.item}
            kind={movementModal.kind}
            onClose={() => setMovementModal(null)}
            onSaved={() => {
              setMovementModal(null);
              refresh();
            }}
          />
        )}
        {configModal && (
          <ConfigModal
            item={configModal}
            onClose={() => setConfigModal(null)}
            onSaved={() => {
              setConfigModal(null);
              refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Item row
   ═══════════════════════════════════════════════════════════ */

function StockItemRow({
  item,
  onRestock,
  onLoss,
  onAdjust,
  onConfigure,
}: {
  item: MenuItemWithStockInfo;
  onRestock: () => void;
  onLoss: () => void;
  onAdjust: () => void;
  onConfigure: () => void;
}) {
  const tracked = item.track_stock;
  const qty = item.stock_quantity ?? 0;
  const threshold = item.stock_threshold_low ?? 5;
  const isOut = tracked && qty === 0;
  const isLow = tracked && qty > 0 && qty <= threshold;

  return (
    <motion.li layout>
      <div
        className={[
          "rounded-xl border p-4 flex items-center gap-3 flex-wrap transition",
          isOut
            ? "bg-red/5 border-red/40"
            : isLow
              ? "bg-amber-50 border-amber-300"
              : tracked
                ? "bg-white-warm border-terracotta/20"
                : "bg-cream/40 border-terracotta/15",
        ].join(" ")}
      >
        {/* Item info */}
        <div className="flex items-baseline gap-2 min-w-0 flex-1">
          {item.category_icon && (
            <span className="text-xl" aria-hidden>
              {item.category_icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-brown truncate">
              {item.name}
            </h3>
            <p className="text-[10px] text-brown-light/70">
              {item.category_title ?? "—"} · {formatCents(item.price_cents)}
            </p>
          </div>
        </div>

        {/* Stock count */}
        {tracked ? (
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div
                className={[
                  "font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums leading-none",
                  isOut
                    ? "text-red-dark"
                    : isLow
                      ? "text-amber-700"
                      : "text-brown",
                ].join(" ")}
              >
                {qty}
              </div>
              <div className="text-[10px] text-brown-light/70 mt-0.5">
                {isOut
                  ? "🚫 Rupture"
                  : isLow
                    ? `⚠ Seuil ${threshold}`
                    : `Seuil ${threshold}`}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-brown-light/60 italic flex-shrink-0">
            Non suivi
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tracked ? (
            <>
              <button
                type="button"
                onClick={onRestock}
                className="h-9 px-3 rounded-lg bg-green-100 hover:bg-green-200 text-green-800 text-xs font-bold border border-green-300 transition active:scale-95"
                title="Ré-approvisionner"
              >
                + Restock
              </button>
              <button
                type="button"
                onClick={onLoss}
                className="h-9 px-3 rounded-lg bg-cream hover:bg-red/10 text-brown hover:text-red-dark text-xs font-semibold border border-terracotta/30 transition active:scale-95"
                title="Déclarer une perte"
              >
                💔 Perte
              </button>
              <button
                type="button"
                onClick={onAdjust}
                className="h-9 px-3 rounded-lg bg-cream hover:bg-amber-50 text-brown text-xs font-semibold border border-terracotta/30 transition active:scale-95"
                title="Ajuster (inventaire physique)"
              >
                ✏ Ajuster
              </button>
              <button
                type="button"
                onClick={onConfigure}
                className="h-9 w-9 rounded-lg bg-cream hover:bg-gold/10 text-brown-light hover:text-brown text-sm transition active:scale-95 inline-flex items-center justify-center border border-terracotta/30"
                title="Configurer"
              >
                ⚙
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onConfigure}
              className="h-9 px-3 rounded-lg bg-brown hover:bg-brown-light text-cream text-xs font-bold transition active:scale-95"
            >
              Activer le suivi
            </button>
          )}
        </div>
      </div>
    </motion.li>
  );
}

/* ═══════════════════════════════════════════════════════════
   Movement modal — restock / loss / adjustment
   ═══════════════════════════════════════════════════════════ */

function MovementModal({
  item,
  kind,
  onClose,
  onSaved,
}: {
  item: MenuItemWithStockInfo;
  kind: "restock" | "loss" | "adjustment";
  onClose: () => void;
  onSaved: () => void;
}) {
  const isLoss = kind === "loss";
  const isAdjust = kind === "adjustment";
  const [delta, setDelta] = useState<string>(
    isLoss ? "-1" : isAdjust ? "0" : "10"
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericDelta = parseInt(delta, 10);
  const valid =
    Number.isFinite(numericDelta) &&
    numericDelta !== 0 &&
    Math.abs(numericDelta) <= 10000 &&
    (kind !== "restock" || numericDelta > 0) &&
    (kind !== "loss" || numericDelta < 0);

  const currentQty = item.stock_quantity ?? 0;
  const newQty = Math.max(0, currentQty + (numericDelta || 0));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stock/movement", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_item_id: item.id,
          kind,
          delta: numericDelta,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const meta = MOVEMENT_LABELS[kind];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md sm:w-full z-50"
        role="dialog"
      >
        <form
          onSubmit={submit}
          className="bg-white-warm rounded-2xl shadow-2xl border border-terracotta/30 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-terracotta/20">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl" aria-hidden>
                {meta.icon}
              </span>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown">
                {meta.label}
              </h2>
            </div>
            <p className="text-xs text-brown-light/80 mt-0.5">
              {item.name}{" "}
              <span className="text-brown-light/50">
                · stock actuel : {currentQty}
              </span>
            </p>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-2">
                {kind === "restock"
                  ? "Quantité ajoutée"
                  : kind === "loss"
                    ? "Quantité perdue"
                    : "Ajustement (+/-)"}
              </label>
              {kind === "restock" || kind === "loss" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={isLoss ? Math.abs(numericDelta) || "" : delta}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        setDelta("");
                        return;
                      }
                      const n = parseInt(v, 10);
                      if (!Number.isFinite(n)) return;
                      setDelta(isLoss ? `-${Math.abs(n)}` : String(n));
                    }}
                    min="1"
                    max="10000"
                    autoFocus
                    className="flex-1 h-12 px-3 rounded-lg bg-cream border border-terracotta/40 text-brown text-2xl font-bold tabular-nums text-center focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                  <span className="text-brown-light text-sm">unités</span>
                </div>
              ) : (
                /* Adjustment : input signed */
                <input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  min="-10000"
                  max="10000"
                  step="1"
                  autoFocus
                  placeholder="ex: +5 ou -3"
                  className="w-full h-12 px-3 rounded-lg bg-cream border border-terracotta/40 text-brown text-2xl font-bold tabular-nums text-center focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
              )}
            </div>

            {/* Preview */}
            <div className="rounded-lg bg-gold/10 border border-gold/30 p-3 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-brown-light/80 font-bold">
                Stock après
              </span>
              <span className="font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-brown">
                {newQty}
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
                Note (optionnel)
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  kind === "restock"
                    ? "ex: livraison du fournisseur Métro"
                    : kind === "loss"
                      ? "ex: cassée à la cuisson"
                      : "ex: inventaire de fin de soirée"
                }
                maxLength={200}
                className="w-full px-3 py-2.5 rounded-lg bg-cream border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          {error && (
            <div className="mx-5 mb-2 rounded-lg border border-red/40 bg-red/10 text-red-dark text-xs px-3 py-2">
              ⚠ {error}
            </div>
          )}

          <div className="px-5 py-3 border-t border-terracotta/20 flex items-center justify-end gap-2 bg-white-warm">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg text-sm text-brown-light hover:text-brown transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!valid || busy}
              className="h-10 px-5 rounded-lg bg-brown text-cream text-sm font-bold hover:bg-brown-light transition disabled:opacity-50 active:scale-95"
            >
              {busy ? "Enregistrement…" : "Confirmer"}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   Config modal — activate/deactivate tracking + threshold
   ═══════════════════════════════════════════════════════════ */

function ConfigModal({
  item,
  onClose,
  onSaved,
}: {
  item: MenuItemWithStockInfo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tracked, setTracked] = useState(item.track_stock ?? false);
  const [quantity, setQuantity] = useState<string>(
    String(item.stock_quantity ?? 0)
  );
  const [threshold, setThreshold] = useState<string>(
    String(item.stock_threshold_low ?? 5)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stock/${item.id}/config`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track_stock: tracked,
          stock_quantity: tracked ? Math.max(0, parseInt(quantity, 10) || 0) : undefined,
          stock_threshold_low: Math.max(0, parseInt(threshold, 10) || 5),
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md sm:w-full z-50"
        role="dialog"
      >
        <form
          onSubmit={submit}
          className="bg-white-warm rounded-2xl shadow-2xl border border-terracotta/30 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-terracotta/20">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown">
              ⚙ Suivi de stock
            </h2>
            <p className="text-xs text-brown-light/80 mt-0.5">
              {item.name} · {formatCents(item.price_cents)}
            </p>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-cream border border-terracotta/30">
              <div>
                <p className="text-sm font-semibold text-brown">
                  Activer le suivi du stock
                </p>
                <p className="text-[11px] text-brown-light/80">
                  Auto-décrément à l&apos;envoi cuisine, alerte seuil bas.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={tracked}
                onClick={() => setTracked((v) => !v)}
                className={[
                  "w-12 h-7 rounded-full relative transition",
                  tracked ? "bg-gold" : "bg-brown/20",
                ].join(" ")}
              >
                <motion.span
                  layout
                  className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow"
                  animate={{ left: tracked ? 22 : 2 }}
                  transition={{ type: "spring", stiffness: 600, damping: 32 }}
                />
              </button>
            </div>

            {tracked && (
              <>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
                    Quantité initiale en stock
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    max="100000"
                    className="w-full h-12 px-3 rounded-lg bg-cream border border-terracotta/40 text-brown text-2xl font-bold tabular-nums text-center focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                  <p className="text-[10px] text-brown-light/70 mt-1">
                    Nombre d&apos;unités vendables. Ex : 12 pour 12 pizzas
                    Margherita prêtes ce soir.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
                    Seuil d&apos;alerte
                  </label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    min="0"
                    max="1000"
                    className="w-full h-12 px-3 rounded-lg bg-cream border border-terracotta/40 text-brown text-2xl font-bold tabular-nums text-center focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                  <p className="text-[10px] text-brown-light/70 mt-1">
                    Quand stock ≤ ce nombre, alerte affichée. Ex : 3 pour
                    être prévenu·e quand il reste 3 unités.
                  </p>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="mx-5 mb-2 rounded-lg border border-red/40 bg-red/10 text-red-dark text-xs px-3 py-2">
              ⚠ {error}
            </div>
          )}

          <div className="px-5 py-3 border-t border-terracotta/20 flex items-center justify-end gap-2 bg-white-warm">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg text-sm text-brown-light hover:text-brown transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-10 px-5 rounded-lg bg-brown text-cream text-sm font-bold hover:bg-brown-light transition disabled:opacity-50 active:scale-95"
            >
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   Stat card / Filter pill
   ═══════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  tone = "brown",
  emphasis,
  urgent,
  mono,
}: {
  label: string;
  value: string;
  tone?: "brown" | "gold" | "amber" | "red";
  emphasis?: boolean;
  urgent?: boolean;
  mono?: boolean;
}) {
  const tones: Record<typeof tone, string> = {
    brown: "text-brown",
    gold: "text-gold",
    amber: "text-amber-700",
    red: "text-red-dark",
  };
  return (
    <div
      className={[
        "rounded-2xl bg-white-warm border p-4",
        emphasis ? "border-gold/40 bg-gold/5" : "border-terracotta/20",
        urgent ? "animate-pulse" : "",
      ].join(" ")}
    >
      <div
        className={[
          "font-[family-name:var(--font-display)] font-bold leading-none",
          mono ? "tabular-nums" : "tabular-nums",
          emphasis ? "text-3xl" : "text-2xl",
          tones[tone],
        ].join(" ")}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-2">
        {label}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  urgent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  urgent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95",
        active
          ? urgent
            ? "bg-amber-600 text-white"
            : "bg-brown text-cream"
          : "bg-white-warm text-brown-light hover:text-brown border border-terracotta/20",
      ].join(" ")}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={[
            "inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums",
            active
              ? urgent
                ? "bg-white/20 text-white"
                : "bg-cream/20 text-cream"
              : urgent
                ? "bg-amber-100 text-amber-800"
                : "bg-cream text-brown-light",
          ].join(" ")}
        >
          {count}
        </span>
      )}
    </button>
  );
}
