"use client";

/**
 * /admin/stock/ingredients — CRUD ingrédients + mouvements de stock.
 *
 * Sections :
 *   - Filtres pills (toutes / alertes / par catégorie)
 *   - Bouton "+ Ajouter un ingrédient"
 *   - Liste des ingrédients avec quick actions :
 *     - Restock (livraison fournisseur, optionnellement avec coût)
 *     - Inventaire (override quantity)
 *     - Perte (delta négatif)
 *   - Modale création / édition
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatCents } from "@/lib/format";
import {
  INGREDIENT_CATEGORIES,
  type IngredientCategory,
  type IngredientRow,
  type IngredientStats,
  type IngredientUnit,
} from "@/lib/db/ingredient-types";

const UNITS: IngredientUnit[] = [
  "g",
  "kg",
  "ml",
  "L",
  "cl",
  "unité",
  "tranche",
  "botte",
];

type Filter = "all" | "alerts" | IngredientCategory;

export default function IngredientsPage() {
  const [items, setItems] = useState<IngredientRow[]>([]);
  const [stats, setStats] = useState<IngredientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<IngredientRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [movingItem, setMovingItem] = useState<IngredientRow | null>(null);

  const fetchData = useCallback(async () => {
    const url = `/api/admin/ingredients?${
      filter === "alerts"
        ? "filter=alerts"
        : filter === "all"
          ? ""
          : `category=${encodeURIComponent(filter)}`
    }`;
    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setItems(data.ingredients ?? []);
    setStats(data.stats ?? null);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.supplier_name?.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-brown-dark">
            Ingrédients
          </h1>
          <p className="text-sm text-brown-light/80 mt-0.5">
            {stats?.active_ingredients ?? 0} actifs ·{" "}
            {formatCents(stats?.total_value_cents ?? 0)} de valeur stock
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-brown hover:bg-brown-dark text-cream font-bold text-sm transition active:scale-95"
        >
          + Ajouter un ingrédient
        </button>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="space-y-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un ingrédient, un fournisseur…"
          className="w-full h-11 px-4 rounded-xl border border-brown/15 bg-cream/40 text-sm placeholder:text-brown-light/50 focus:outline-none focus:border-gold transition"
        />
        <div className="flex gap-1.5 flex-wrap">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="Toutes"
            count={stats?.active_ingredients}
          />
          <FilterPill
            active={filter === "alerts"}
            onClick={() => setFilter("alerts")}
            label="Alertes"
            count={
              (stats?.low_stock_count ?? 0) + (stats?.out_of_stock_count ?? 0)
            }
            tone="amber"
          />
          {INGREDIENT_CATEGORIES.map((c) => (
            <FilterPill
              key={c}
              active={filter === c}
              onClick={() => setFilter(c)}
              label={c}
            />
          ))}
        </div>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-brown/5 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brown/15 p-12 text-center">
          <p className="text-4xl">🥬</p>
          <p className="text-sm text-brown-light/70 mt-3">
            {items.length === 0
              ? "Aucun ingrédient pour le moment."
              : "Aucun résultat."}
          </p>
          {items.length === 0 && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center justify-center h-10 px-4 rounded-lg bg-gold hover:bg-gold-dark text-brown-dark font-bold text-sm transition active:scale-95"
            >
              Ajouter mon premier ingrédient
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((it) => (
            <IngredientRowItem
              key={it.id}
              item={it}
              onEdit={() => setEditing(it)}
              onMove={() => setMovingItem(it)}
            />
          ))}
        </ul>
      )}

      {/* MODAL : create */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onSaved={() => {
              setShowCreate(false);
              fetchData();
            }}
          />
        )}
        {editing && (
          <EditModal
            item={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              fetchData();
            }}
          />
        )}
        {movingItem && (
          <MovementModal
            item={movingItem}
            onClose={() => setMovingItem(null)}
            onSaved={() => {
              setMovingItem(null);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════ Components ════════════════════════ */

function FilterPill({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  tone?: "amber";
}) {
  const baseActive =
    tone === "amber"
      ? "bg-amber-500 text-white"
      : "bg-brown text-cream";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold transition active:scale-95 ${
        active
          ? baseActive
          : "bg-cream-dark text-brown hover:bg-cream-darker"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            active
              ? "bg-cream/20 text-cream"
              : "bg-brown/10 text-brown-light"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function IngredientRowItem({
  item,
  onEdit,
  onMove,
}: {
  item: IngredientRow;
  onEdit: () => void;
  onMove: () => void;
}) {
  const qty = Number(item.stock_quantity);
  const threshold = Number(item.stock_threshold_low);
  const isOut = qty === 0;
  const isLow = !isOut && qty <= threshold;
  const valueCents = Math.round(qty * item.cost_per_unit_cents);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-cream/30 p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center ${
        isOut
          ? "border-red/30 bg-red/5"
          : isLow
            ? "border-amber-400/40 bg-amber-50"
            : "border-brown/10"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-bold text-sm text-brown-dark">{item.name}</span>
          <span className="text-[10px] uppercase tracking-wider text-brown-light/60 px-1.5 py-0.5 bg-brown/5 rounded">
            {item.category}
          </span>
          {isOut && (
            <span className="text-[10px] uppercase font-bold text-red-dark px-1.5 py-0.5 bg-red/10 rounded">
              Rupture
            </span>
          )}
          {isLow && (
            <span className="text-[10px] uppercase font-bold text-amber-700 px-1.5 py-0.5 bg-amber-200/60 rounded">
              Seuil bas
            </span>
          )}
        </div>
        <p className="text-xs text-brown-light/70 mt-0.5 truncate">
          {item.supplier_name
            ? `Fournisseur : ${item.supplier_name}${item.supplier_ref ? ` · ref ${item.supplier_ref}` : ""}`
            : "Pas de fournisseur"}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p
            className={`font-[family-name:var(--font-display)] text-xl ${
              isOut ? "text-red-dark" : isLow ? "text-amber-700" : "text-brown-dark"
            }`}
          >
            {qty.toLocaleString("fr-FR")}{" "}
            <span className="text-sm font-normal text-brown-light/70">
              {item.unit}
            </span>
          </p>
          <p className="text-[11px] text-brown-light/60">
            {formatCents(valueCents)} ·{" "}
            {formatCents(item.cost_per_unit_cents)}/{item.unit}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onMove}
            className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-brown hover:bg-brown-dark text-cream text-[11px] font-bold transition active:scale-95"
          >
            ± Mouvement
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-cream-dark hover:bg-cream-darker text-brown text-[11px] font-bold transition active:scale-95"
          >
            ✏ Éditer
          </button>
        </div>
      </div>
    </motion.li>
  );
}

/* ─────────────────── Modals ─────────────────── */

function CreateModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <IngredientModal
      title="Ajouter un ingrédient"
      onClose={onClose}
      onSubmit={async (form) => {
        const res = await fetch("/api/admin/ingredients", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error || "Erreur création");
        }
        onSaved();
      }}
    />
  );
}

function EditModal({
  item,
  onClose,
  onSaved,
}: {
  item: IngredientRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <IngredientModal
      title={`Éditer · ${item.name}`}
      initial={item}
      lockStockQuantity
      onClose={onClose}
      onSubmit={async (form) => {
        const res = await fetch(`/api/admin/ingredients/${item.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error || "Erreur modification");
        }
        onSaved();
      }}
    />
  );
}

function IngredientModal({
  title,
  initial,
  lockStockQuantity,
  onClose,
  onSubmit,
}: {
  title: string;
  initial?: IngredientRow;
  lockStockQuantity?: boolean;
  onClose: () => void;
  onSubmit: (form: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState<IngredientUnit>(initial?.unit ?? "g");
  const [category, setCategory] = useState<IngredientCategory>(
    initial?.category ?? "Frais"
  );
  const [stockQ, setStockQ] = useState<string>(
    initial?.stock_quantity !== undefined
      ? String(initial.stock_quantity)
      : "0"
  );
  const [threshold, setThreshold] = useState<string>(
    initial?.stock_threshold_low !== undefined
      ? String(initial.stock_threshold_low)
      : "0"
  );
  const [costEuros, setCostEuros] = useState<string>(
    initial ? (initial.cost_per_unit_cents / 100).toFixed(2) : "0"
  );
  const [supplierName, setSupplierName] = useState(initial?.supplier_name ?? "");
  const [supplierRef, setSupplierRef] = useState(initial?.supplier_ref ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        unit,
        category,
        stock_threshold_low: Number(threshold || 0),
        cost_per_unit_cents: Math.round(Number(costEuros || 0) * 100),
        supplier_name: supplierName.trim() || null,
        supplier_ref: supplierRef.trim() || null,
        notes: notes.trim() || null,
      };
      if (!lockStockQuantity) {
        payload.stock_quantity = Number(stockQ || 0);
      }
      await onSubmit(payload);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-brown-dark/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.form
        onSubmit={handleSubmit}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-cream rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5 border-b border-brown/10 sticky top-0 bg-cream z-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-brown-dark">
            {title}
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Nom *">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Mozzarella di buffala…"
              className="w-full h-11 px-3 rounded-lg border border-brown/15 bg-white text-sm focus:outline-none focus:border-gold"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unité *">
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as IngredientUnit)}
                className="w-full h-11 px-3 rounded-lg border border-brown/15 bg-white text-sm"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Catégorie">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IngredientCategory)}
                className="w-full h-11 px-3 rounded-lg border border-brown/15 bg-white text-sm"
              >
                {INGREDIENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {!lockStockQuantity && (
            <Field label={`Stock initial (${unit})`}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={stockQ}
                onChange={(e) => setStockQ(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-brown/15 bg-white text-sm"
              />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label={`Seuil alerte (${unit})`}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-brown/15 bg-white text-sm"
              />
            </Field>
            <Field label={`Coût €/${unit}`}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costEuros}
                onChange={(e) => setCostEuros(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-brown/15 bg-white text-sm"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fournisseur">
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Métro, Promocash…"
                className="w-full h-11 px-3 rounded-lg border border-brown/15 bg-white text-sm"
              />
            </Field>
            <Field label="Référence">
              <input
                type="text"
                value={supplierRef}
                onChange={(e) => setSupplierRef(e.target.value)}
                placeholder="Code article"
                className="w-full h-11 px-3 rounded-lg border border-brown/15 bg-white text-sm"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Conserver au frais, AOP…"
              className="w-full px-3 py-2 rounded-lg border border-brown/15 bg-white text-sm resize-none"
            />
          </Field>

          {err && (
            <p className="text-xs text-red-dark bg-red/5 px-3 py-2 rounded-lg">
              {err}
            </p>
          )}
        </div>

        <div className="p-5 pt-0 flex gap-2 sticky bottom-0 bg-cream border-t border-brown/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-lg border border-brown/15 text-brown text-sm font-bold hover:bg-brown/5 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-[2] h-11 rounded-lg bg-brown hover:bg-brown-dark text-cream text-sm font-bold transition active:scale-95 disabled:opacity-40"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function MovementModal({
  item,
  onClose,
  onSaved,
}: {
  item: IngredientRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<
    "restock" | "loss" | "adjustment" | "inventory"
  >("restock");
  const [delta, setDelta] = useState("0");
  const [costEuros, setCostEuros] = useState<string>(
    (item.cost_per_unit_cents / 100).toFixed(2)
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);

    const dNum = Number(delta);
    if (!Number.isFinite(dNum)) {
      setErr("Quantité invalide");
      setSaving(false);
      return;
    }

    const body: Record<string, unknown> = {
      kind,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (kind === "inventory") {
      body.quantityAbs = Math.max(0, dNum);
    } else if (kind === "loss") {
      body.delta = -Math.abs(dNum); // perte = toujours négatif
    } else if (kind === "restock") {
      body.delta = Math.abs(dNum); // restock = positif
      const c = Math.round(Number(costEuros || 0) * 100);
      if (c > 0) body.costPerUnitCents = c;
    } else {
      body.delta = dNum; // adjustment = signé
    }

    try {
      const res = await fetch(`/api/admin/ingredients/${item.id}/movement`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e2 = await res.json().catch(() => null);
        throw new Error(e2?.error || "Erreur");
      }
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const KIND_DESCRIPTIONS: Record<typeof kind, string> = {
    restock: "Livraison fournisseur. Le stock augmente.",
    loss: "Perte / casse / périmé. Le stock diminue.",
    adjustment: "Correction manuelle (signe libre).",
    inventory: "Inventaire physique. Remplace le stock par la quantité saisie.",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-brown-dark/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.form
        onSubmit={handleSubmit}
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-cream rounded-t-3xl sm:rounded-2xl shadow-2xl"
      >
        <div className="p-5 border-b border-brown/10">
          <p className="text-[11px] uppercase tracking-wider text-brown-light/70 font-bold">
            Mouvement de stock
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-brown-dark mt-1">
            {item.name}
          </h2>
          <p className="text-xs text-brown-light/70 mt-0.5">
            Stock actuel :{" "}
            <strong>
              {Number(item.stock_quantity).toLocaleString("fr-FR")} {item.unit}
            </strong>
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Kind picker */}
          <div className="grid grid-cols-2 gap-2">
            {(["restock", "inventory", "loss", "adjustment"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`p-3 rounded-xl border text-left transition ${
                  kind === k
                    ? "border-gold bg-gold/10 text-brown-dark"
                    : "border-brown/15 bg-white text-brown hover:border-brown/30"
                }`}
              >
                <p className="text-sm font-bold capitalize">
                  {k === "restock"
                    ? "📦 Restock"
                    : k === "loss"
                      ? "💔 Perte"
                      : k === "adjustment"
                        ? "✏ Ajustement"
                        : "🔢 Inventaire"}
                </p>
              </button>
            ))}
          </div>
          <p className="text-xs text-brown-light/70 -mt-2">
            {KIND_DESCRIPTIONS[kind]}
          </p>

          {/* Quantity */}
          <Field
            label={
              kind === "inventory"
                ? `Quantité physique réelle (${item.unit})`
                : kind === "loss"
                  ? `Perdu (${item.unit})`
                  : kind === "restock"
                    ? `Quantité reçue (${item.unit})`
                    : `Delta (${item.unit}, négatif autorisé)`
            }
          >
            <input
              type="number"
              step="0.001"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              autoFocus
              className="w-full h-11 px-3 rounded-lg border border-brown/15 bg-white text-sm font-mono text-lg"
            />
          </Field>

          {kind === "restock" && (
            <Field
              label={`Coût d'achat €/${item.unit} (optionnel — met à jour le coût pondéré)`}
            >
              <input
                type="number"
                step="0.01"
                min="0"
                value={costEuros}
                onChange={(e) => setCostEuros(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-brown/15 bg-white text-sm"
              />
            </Field>
          )}

          {(kind === "restock" || kind === "loss") && (
            <Field label="Référence (BL fournisseur, ticket…)">
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="BL-2026-001"
                className="w-full h-11 px-3 rounded-lg border border-brown/15 bg-white text-sm"
              />
            </Field>
          )}

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-brown/15 bg-white text-sm resize-none"
            />
          </Field>

          {err && (
            <p className="text-xs text-red-dark bg-red/5 px-3 py-2 rounded-lg">
              {err}
            </p>
          )}
        </div>

        <div className="p-5 pt-0 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-lg border border-brown/15 text-brown text-sm font-bold hover:bg-brown/5 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[2] h-11 rounded-lg bg-brown hover:bg-brown-dark text-cream text-sm font-bold transition active:scale-95 disabled:opacity-40"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-brown-light/70 font-bold mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
