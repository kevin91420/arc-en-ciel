"use client";

/**
 * /admin/menu — Éditeur de carte (Sprint 5).
 *
 * Permet à n'importe quel resto de gérer sa carte sans toucher au code :
 *   - CRUD catégories (titre, icône, station cuisine, ordre)
 *   - CRUD items (nom, description, prix, photo, tags, signature/popular/chef)
 *   - Activer/désactiver sans supprimer (saisonnalité)
 *
 * La carte est seedée automatiquement depuis src/data/carte.ts au premier
 * édit pour ne pas partir de rien sur un nouveau tenant.
 */

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { formatCents } from "@/lib/format";
import type {
  DietaryTag,
  MenuCategoryFull,
  MenuItemFull,
  MenuItemRow,
  MenuCategoryRow,
} from "@/lib/db/menu-types";
import type { Station } from "@/lib/db/pos-types";

const TAG_OPTIONS: { key: DietaryTag; label: string; color: string }[] = [
  { key: "halal", label: "Halal", color: "bg-emerald-100 text-emerald-700" },
  { key: "vegetarien", label: "Végé", color: "bg-lime-100 text-lime-700" },
  { key: "vegan", label: "Vegan", color: "bg-green-100 text-green-700" },
  { key: "sans-gluten", label: "Sans gluten", color: "bg-amber-100 text-amber-700" },
  { key: "epice", label: "Épicé", color: "bg-orange-100 text-orange-700" },
];

const STATION_OPTIONS: { key: Station; label: string; emoji: string }[] = [
  { key: "main", label: "Cuisine principale", emoji: "🍲" },
  { key: "pizza", label: "Pizza", emoji: "🍕" },
  { key: "grill", label: "Grill", emoji: "🥩" },
  { key: "cold", label: "Froid (entrées/salades)", emoji: "🥗" },
  { key: "dessert", label: "Pâtisserie", emoji: "🍰" },
  { key: "bar", label: "Bar (boissons)", emoji: "🍷" },
];

const ICON_PRESETS = ["🫒", "🍕", "🥩", "🍝", "🥗", "🍰", "🍷", "🍔", "🌯", "🍣", "🍜", "☕", "🥪", "🍦"];

type ItemDraft = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  signature: boolean;
  popular: boolean;
  chef: boolean;
  tags: DietaryTag[];
  active: boolean;
  variants: VariantDraft[];
  modifiers: ModifierDraft[];
};

type VariantDraft = {
  label: string;
  price_delta_cents: number;
  is_default: boolean;
};

type ModifierDraft = {
  label: string;
  price_delta_cents: number;
  is_required: boolean;
};

type CategoryDraft = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  intro: string;
  icon: string;
  station: Station;
  active: boolean;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export default function MenuEditorPage() {
  const [menu, setMenu] = useState<MenuCategoryFull[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemModal, setItemModal] = useState<
    | { mode: "create"; categoryId: string }
    | { mode: "edit"; item: MenuItemFull }
    | null
  >(null);
  const [categoryModal, setCategoryModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; category: MenuCategoryFull }
    | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/menu?include_inactive=1", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as MenuCategoryFull[];
      setMenu(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  /* ── Mutations ─────────────────────────────────── */

  async function patchItem(id: string, patch: Partial<MenuItemRow>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/menu/items/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(draft: ItemDraft) {
    setBusy(true);
    try {
      const { variants, modifiers, ...itemPayload } = draft;
      const res = await fetch(`/api/admin/menu/items`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...itemPayload, position: 999 }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      /* Persist variants + modifiers as a single replace-set on the same id. */
      await Promise.all([
        fetch(`/api/admin/menu/items/${draft.id}/variants`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variants }),
        }),
        fetch(`/api/admin/menu/items/${draft.id}/modifiers`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modifiers }),
        }),
      ]);
      await refresh();
      flashToast("Plat enregistré ✓");
      setItemModal(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function patchItemAndRelations(
    id: string,
    patch: Partial<MenuItemRow>,
    variants: VariantDraft[],
    modifiers: ModifierDraft[]
  ) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/menu/items/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      await Promise.all([
        fetch(`/api/admin/menu/items/${id}/variants`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variants }),
        }),
        fetch(`/api/admin/menu/items/${id}/modifiers`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modifiers }),
        }),
      ]);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Supprimer ce plat ? (cette action est irréversible)")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/menu/items/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
      flashToast("Plat supprimé");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveCategory(draft: CategoryDraft) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/menu/categories`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await refresh();
      flashToast("Catégorie enregistrée ✓");
      setCategoryModal(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function patchCategory(id: string, patch: Partial<MenuCategoryRow>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/menu/categories/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(id: string) {
    if (
      !confirm(
        "Supprimer cette catégorie ? Tous les plats à l'intérieur seront aussi supprimés."
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/menu/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
      flashToast("Catégorie supprimée");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reorderCategories(next: MenuCategoryFull[]) {
    setMenu(next); /* optimistic */
    await Promise.all(
      next.map((c, i) =>
        c.position !== i
          ? fetch(`/api/admin/menu/categories/${c.id}`, {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ position: i }),
            }).catch(() => null)
          : Promise.resolve(null)
      )
    );
  }

  /* ── Render ────────────────────────────────────── */

  const totalItems = useMemo(
    () => (menu ?? []).reduce((s, c) => s + c.items.length, 0),
    [menu]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link
          href="/admin/parametres"
          className="inline-flex items-center gap-1.5 text-xs text-brown-light/70 hover:text-brown font-semibold mb-3 transition"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Retour aux paramètres
        </Link>
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Configuration
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Carte
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          Modifiez vos plats, prix, descriptions et photos en temps réel. Les
          changements apparaissent instantanément sur le site, le QR menu et le
          POS — sans toucher au code.
        </p>
      </motion.div>

      {/* Stats + actions */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 rounded-2xl bg-white-warm border border-terracotta/20 p-5 flex items-baseline justify-between flex-wrap gap-4"
      >
        <div className="flex items-baseline gap-6">
          <div>
            <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown leading-none">
              {menu?.length ?? "…"}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-1">
              Catégories
            </div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown leading-none">
              {totalItems}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-1">
              Plats au total
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/menu/combos"
            className="inline-flex items-center gap-2 bg-cream hover:bg-cream-dark border border-terracotta/30 text-brown text-sm font-bold px-4 py-2.5 rounded-full transition active:scale-95"
          >
            <span aria-hidden>🍽</span>
            Formules
          </Link>
          <button
            type="button"
            onClick={() => setCategoryModal({ mode: "create" })}
            disabled={busy}
            className="inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream text-sm font-bold px-4 py-2.5 rounded-full transition active:scale-95"
          >
            <span className="text-lg leading-none">+</span>
            Nouvelle catégorie
          </button>
        </div>
      </motion.section>

      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/10 text-red-dark text-sm p-3">
          {error}
        </div>
      )}

      {!menu && (
        <p className="text-brown-light text-sm py-12 text-center">
          Chargement…
        </p>
      )}

      {/* Categories + items */}
      {menu && menu.length > 0 && (
        <Reorder.Group
          axis="y"
          values={menu}
          onReorder={reorderCategories}
          className="space-y-4"
        >
          {menu.map((cat) => (
            <Reorder.Item
              key={cat.id}
              value={cat}
              className="rounded-3xl bg-white-warm border border-terracotta/20 overflow-hidden"
              whileDrag={{ scale: 1.005, boxShadow: "0 12px 32px rgba(0,0,0,0.1)" }}
            >
              <CategoryHeader
                category={cat}
                onEdit={() => setCategoryModal({ mode: "edit", category: cat })}
                onAddItem={() =>
                  setItemModal({ mode: "create", categoryId: cat.id })
                }
                onToggleActive={() =>
                  patchCategory(cat.id, { active: !cat.active })
                }
                onDelete={() => deleteCategory(cat.id)}
              />
              <ul className="divide-y divide-terracotta/10">
                {cat.items.length === 0 ? (
                  <li className="px-5 py-6 text-sm text-brown-light/70 italic text-center">
                    Aucun plat. Cliquez « + Plat » ci-dessus.
                  </li>
                ) : (
                  cat.items.map((it) => (
                    <ItemRow
                      key={it.id}
                      item={it}
                      onEdit={() => setItemModal({ mode: "edit", item: it })}
                      onToggleActive={() =>
                        patchItem(it.id, { active: !it.active })
                      }
                      onDelete={() => deleteItem(it.id)}
                    />
                  ))
                )}
              </ul>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {/* ── Item modal ── */}
      <AnimatePresence>
        {itemModal && (
          <ItemEditModal
            mode={itemModal.mode}
            categoryId={
              itemModal.mode === "create"
                ? itemModal.categoryId
                : itemModal.item.category_id
            }
            initial={
              itemModal.mode === "edit"
                ? itemModal.item
                : undefined
            }
            categories={menu ?? []}
            busy={busy}
            onCancel={() => setItemModal(null)}
            onSave={async (draft) => {
              if (itemModal.mode === "edit") {
                const { id: _id, variants, modifiers, ...rest } = draft;
                void _id;
                await patchItemAndRelations(
                  itemModal.item.id,
                  rest,
                  variants,
                  modifiers
                );
                setItemModal(null);
                flashToast("Plat mis à jour ✓");
              } else {
                await saveItem(draft);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Category modal ── */}
      <AnimatePresence>
        {categoryModal && (
          <CategoryEditModal
            mode={categoryModal.mode}
            initial={
              categoryModal.mode === "edit"
                ? categoryModal.category
                : undefined
            }
            busy={busy}
            onCancel={() => setCategoryModal(null)}
            onSave={async (draft) => {
              if (categoryModal.mode === "edit") {
                const { id: _id, ...rest } = draft;
                void _id;
                await patchCategory(categoryModal.category.id, rest);
                setCategoryModal(null);
                flashToast("Catégorie mise à jour ✓");
              } else {
                await saveCategory(draft);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-brown text-cream px-5 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <span aria-hidden className="text-gold">
              ✓
            </span>
            <span className="font-semibold text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════ */

function CategoryHeader({
  category,
  onEdit,
  onAddItem,
  onToggleActive,
  onDelete,
}: {
  category: MenuCategoryFull;
  onEdit: () => void;
  onAddItem: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const stationLabel = STATION_OPTIONS.find((s) => s.key === category.station)
    ?.label;
  return (
    <div
      className={[
        "flex items-center gap-4 px-5 py-4 border-b border-terracotta/15 cursor-grab active:cursor-grabbing",
        category.active ? "bg-cream/40" : "bg-cream/10 opacity-70",
      ].join(" ")}
    >
      <span className="text-3xl flex-shrink-0" aria-hidden>
        {category.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.18em] text-brown-light/70 font-bold">
            {category.number}
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown truncate">
            {category.title}
          </h2>
          {!category.active && (
            <span className="text-[10px] uppercase tracking-wider font-bold bg-brown/20 text-brown px-1.5 py-0.5 rounded">
              Désactivée
            </span>
          )}
        </div>
        <p className="text-xs text-brown-light/80 mt-0.5">
          {category.subtitle || "—"} ·{" "}
          <span className="text-brown-light/60">
            {stationLabel ?? category.station}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <IconBtn label="Éditer" onClick={onEdit}>
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path
              d="M11 4H4v16h16v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconBtn>
        <IconBtn
          label={category.active ? "Désactiver" : "Activer"}
          onClick={onToggleActive}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            {category.active ? (
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M9 9l6 6m-6 0l6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </IconBtn>
        <IconBtn label="Supprimer" onClick={onDelete} danger>
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path
              d="M4 7h16m-3 0v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7m3 0V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </IconBtn>
        <button
          type="button"
          onClick={onAddItem}
          className="ml-2 inline-flex items-center gap-1.5 bg-brown hover:bg-brown-light text-cream text-xs font-bold px-3 py-2 rounded-full transition active:scale-95"
        >
          <span className="text-base leading-none">+</span>
          Plat
        </button>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  item: MenuItemFull;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={[
        "px-5 py-3 flex items-center gap-4 hover:bg-cream/30 transition",
        item.active ? "" : "opacity-50",
      ].join(" ")}
    >
      {item.image_url ? (
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-brown/5 flex-shrink-0">
          <Image
            src={item.image_url}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-brown/5 flex items-center justify-center text-brown-light/50 flex-shrink-0">
          🍽
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="font-[family-name:var(--font-display)] font-semibold text-brown leading-tight">
            {item.name}
          </p>
          {item.signature && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-gold">
              ★ Signature
            </span>
          )}
          {item.popular && !item.signature && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-red">
              Populaire
            </span>
          )}
          {!item.active && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-brown/20 text-brown px-1.5 py-0.5 rounded">
              Off
            </span>
          )}
        </div>
        <p className="text-xs text-brown-light/80 line-clamp-1 mt-0.5">
          {item.description || "Pas de description"}
        </p>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.tags.map((t) => {
              const opt = TAG_OPTIONS.find((o) => o.key === t);
              return (
                <span
                  key={t}
                  className={[
                    "inline-flex items-center text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                    opt?.color ?? "bg-brown/10 text-brown",
                  ].join(" ")}
                >
                  {opt?.label ?? t}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <span className="font-[family-name:var(--font-display)] text-base font-bold text-brown tabular-nums flex-shrink-0">
        {formatCents(item.price_cents)}
      </span>

      <div className="flex items-center gap-1 flex-shrink-0">
        <IconBtn label="Éditer" onClick={onEdit}>
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path
              d="M11 4H4v16h16v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconBtn>
        <IconBtn
          label={item.active ? "Désactiver" : "Activer"}
          onClick={onToggleActive}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            {item.active ? (
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M9 9l6 6m-6 0l6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </IconBtn>
        <IconBtn label="Supprimer" onClick={onDelete} danger>
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
            <path
              d="M4 7h16m-3 0v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7m3 0V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </IconBtn>
      </div>
    </li>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      aria-label={label}
      className={[
        "w-8 h-8 rounded-full flex items-center justify-center transition",
        danger
          ? "text-brown-light hover:text-red hover:bg-red/10"
          : "text-brown-light hover:text-brown hover:bg-cream",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   Item edit modal
   ═══════════════════════════════════════════════════════════ */

function ItemEditModal({
  mode,
  categoryId,
  initial,
  categories,
  busy,
  onCancel,
  onSave,
}: {
  mode: "create" | "edit";
  categoryId: string;
  initial?: MenuItemFull;
  categories: MenuCategoryFull[];
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: ItemDraft) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [id, setId] = useState(initial?.id ?? "");
  const [idTouched, setIdTouched] = useState(Boolean(initial));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceEuros, setPriceEuros] = useState(
    initial ? (initial.price_cents / 100).toFixed(2) : ""
  );
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [signature, setSignature] = useState(initial?.signature ?? false);
  const [popular, setPopular] = useState(initial?.popular ?? false);
  const [chef, setChef] = useState(initial?.chef ?? false);
  const [tags, setTags] = useState<DietaryTag[]>(initial?.tags ?? []);
  const [active, setActive] = useState(initial?.active ?? true);
  const [chosenCategoryId, setChosenCategoryId] = useState(categoryId);
  const [variants, setVariants] = useState<VariantDraft[]>(
    () =>
      (initial?.variants ?? []).map((v) => ({
        label: v.label,
        price_delta_cents: v.price_delta_cents,
        is_default: v.is_default,
      }))
  );
  const [modifiers, setModifiers] = useState<ModifierDraft[]>(
    () =>
      (initial?.modifiers ?? []).map((m) => ({
        label: m.label,
        price_delta_cents: m.price_delta_cents,
        is_required: m.is_required,
      }))
  );

  /* Auto-slug from name when creating. */
  useEffect(() => {
    if (mode === "create" && !idTouched) {
      setId(slugify(name));
    }
  }, [name, mode, idTouched]);

  function toggleTag(tag: DietaryTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(Number(priceEuros.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      alert("Prix invalide");
      return;
    }
    if (!name.trim() || !id.trim()) {
      alert("Nom et identifiant requis");
      return;
    }
    onSave({
      id: id.trim(),
      category_id: chosenCategoryId,
      name: name.trim(),
      description: description.trim(),
      price_cents: cents,
      image_url: imageUrl.trim(),
      signature,
      popular,
      chef,
      tags,
      active,
      variants: variants.filter((v) => v.label.trim().length > 0),
      modifiers: modifiers.filter((m) => m.label.trim().length > 0),
    });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="fixed inset-x-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-full top-8 bottom-8 z-50 overflow-hidden"
        role="dialog"
        aria-modal
      >
        <form
          onSubmit={submit}
          className="bg-white-warm rounded-2xl shadow-2xl border border-terracotta/30 max-h-full flex flex-col"
        >
          <div className="px-5 py-4 border-b border-terracotta/20 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown">
              {mode === "create" ? "Nouveau plat" : "Modifier le plat"}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-brown-light hover:text-brown w-8 h-8 rounded-full flex items-center justify-center"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-4 space-y-4">
            <Field label="Nom du plat" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pizza Margherita"
                maxLength={120}
                autoFocus
                className={fieldCls}
              />
            </Field>

            <Field
              label="Identifiant (slug)"
              hint="Référence stable utilisée par le POS — minuscules + tirets, ne pas changer une fois en service."
            >
              <input
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  setIdTouched(true);
                }}
                placeholder="pizza-margherita"
                disabled={mode === "edit"}
                maxLength={60}
                className={`${fieldCls} font-mono`}
              />
            </Field>

            <Field label="Catégorie" required>
              <select
                value={chosenCategoryId}
                onChange={(e) => setChosenCategoryId(e.target.value)}
                className={fieldCls}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.title}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Prix (€)" required>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={priceEuros}
                  onChange={(e) => setPriceEuros(e.target.value)}
                  placeholder="12.00"
                  className={`${fieldCls} tabular-nums`}
                />
              </Field>
              <Field label="Visible">
                <button
                  type="button"
                  onClick={() => setActive((a) => !a)}
                  className={[
                    "h-10 px-4 rounded-lg text-sm font-bold transition w-full inline-flex items-center justify-center gap-2",
                    active
                      ? "bg-green-100 text-green-700 border border-green-400"
                      : "bg-brown/10 text-brown-light border border-brown/20",
                  ].join(" ")}
                >
                  {active ? "✓ Visible" : "Masqué"}
                </button>
              </Field>
            </div>

            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pâte au levain 48h, tomate San Marzano…"
                rows={3}
                maxLength={500}
                className={`${fieldCls} resize-none`}
              />
            </Field>

            <Field label="Photo (URL)" hint="Lien direct JPG/PNG/WebP (Unsplash, Cloudinary, votre CDN…)">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/…"
                className={fieldCls}
              />
              {imageUrl && (
                <div className="mt-2 inline-flex items-center gap-3 p-2 rounded-lg bg-cream border border-terracotta/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Aperçu"
                    className="w-16 h-16 object-cover rounded"
                  />
                  <span className="text-xs text-brown-light">Aperçu</span>
                </div>
              )}
            </Field>

            <Field label="Mises en avant">
              <div className="flex flex-wrap gap-2">
                <Toggle
                  label="★ Signature"
                  active={signature}
                  onClick={() => setSignature((v) => !v)}
                />
                <Toggle
                  label="🏆 Choix du chef"
                  active={chef}
                  onClick={() => setChef((v) => !v)}
                />
                <Toggle
                  label="🔥 Populaire"
                  active={popular}
                  onClick={() => setPopular((v) => !v)}
                />
              </div>
            </Field>

            <Field label="Régimes / Allergènes">
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((opt) => (
                  <Toggle
                    key={opt.key}
                    label={opt.label}
                    active={tags.includes(opt.key)}
                    onClick={() => toggleTag(opt.key)}
                  />
                ))}
              </div>
            </Field>

            {/* ── Variantes (taille / déclinaison) ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brown-light/80">
                  Variantes (taille S/M/L, déclinaisons)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setVariants((prev) => [
                      ...prev,
                      {
                        label: "",
                        price_delta_cents: 0,
                        is_default: prev.length === 0,
                      },
                    ])
                  }
                  className="text-xs text-brown font-bold hover:text-gold inline-flex items-center gap-1"
                >
                  <span className="text-base leading-none">+</span> Ajouter
                </button>
              </div>
              {variants.length === 0 ? (
                <p className="text-[11px] text-brown-light/70 italic px-2 py-2">
                  Aucune variante. Le plat se vend au prix unique
                  ci-dessus.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {variants.map((v, i) => (
                    <li
                      key={i}
                      className="grid grid-cols-[1fr_120px_auto_auto] gap-2 items-center"
                    >
                      <input
                        value={v.label}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x
                            )
                          )
                        }
                        placeholder={`Variante ${i + 1}`}
                        maxLength={40}
                        className={`${fieldCls} text-sm`}
                      />
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={(v.price_delta_cents / 100).toString()}
                          onChange={(e) => {
                            const cents = Math.round(
                              Number(e.target.value || 0) * 100
                            );
                            setVariants((prev) =>
                              prev.map((x, j) =>
                                j === i
                                  ? { ...x, price_delta_cents: cents }
                                  : x
                              )
                            );
                          }}
                          className={`${fieldCls} text-sm tabular-nums pr-7`}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-brown-light text-xs">
                          €
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setVariants((prev) =>
                            prev.map((x, j) => ({
                              ...x,
                              is_default: j === i,
                            }))
                          )
                        }
                        className={[
                          "h-9 px-2 rounded text-[10px] font-bold uppercase tracking-wider transition",
                          v.is_default
                            ? "bg-gold text-brown"
                            : "bg-cream text-brown-light hover:text-brown",
                        ].join(" ")}
                        title="Marquer comme défaut"
                      >
                        {v.is_default ? "★ Défaut" : "Défaut ?"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setVariants((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="w-8 h-8 rounded-full text-brown-light hover:text-red hover:bg-red/10 transition flex items-center justify-center"
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-[11px] text-brown-light/60">
                Le prix delta s&apos;ajoute au prix de base. Ex : Petite −2,00 €,
                Grande +3,00 €.
              </p>
            </div>

            {/* ── Suppléments tarifés ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brown-light/80">
                  Suppléments / options
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setModifiers((prev) => [
                      ...prev,
                      {
                        label: "",
                        price_delta_cents: 0,
                        is_required: false,
                      },
                    ])
                  }
                  className="text-xs text-brown font-bold hover:text-gold inline-flex items-center gap-1"
                >
                  <span className="text-base leading-none">+</span> Ajouter
                </button>
              </div>
              {modifiers.length === 0 ? (
                <p className="text-[11px] text-brown-light/70 italic px-2 py-2">
                  Pas de supplément. Le serveur peut quand même ajouter des
                  notes au moment de la commande.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {modifiers.map((m, i) => (
                    <li
                      key={i}
                      className="grid grid-cols-[1fr_120px_auto] gap-2 items-center"
                    >
                      <input
                        value={m.label}
                        onChange={(e) =>
                          setModifiers((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x
                            )
                          )
                        }
                        placeholder={`Supplément ${i + 1}`}
                        maxLength={40}
                        className={`${fieldCls} text-sm`}
                      />
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={(m.price_delta_cents / 100).toString()}
                          onChange={(e) => {
                            const cents = Math.round(
                              Number(e.target.value || 0) * 100
                            );
                            setModifiers((prev) =>
                              prev.map((x, j) =>
                                j === i
                                  ? { ...x, price_delta_cents: cents }
                                  : x
                              )
                            );
                          }}
                          className={`${fieldCls} text-sm tabular-nums pr-7`}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-brown-light text-xs">
                          €
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setModifiers((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="w-8 h-8 rounded-full text-brown-light hover:text-red hover:bg-red/10 transition flex items-center justify-center"
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-[11px] text-brown-light/60">
                Ex : Extra fromage +2,00 € / Sans oignons 0,00 €. Le serveur
                pourra cocher ces options au moment d&apos;ajouter le plat.
              </p>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-terracotta/20 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
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
   Category edit modal
   ═══════════════════════════════════════════════════════════ */

function CategoryEditModal({
  mode,
  initial,
  busy,
  onCancel,
  onSave,
}: {
  mode: "create" | "edit";
  initial?: MenuCategoryFull;
  busy: boolean;
  onCancel: () => void;
  onSave: (draft: CategoryDraft) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [id, setId] = useState(initial?.id ?? "");
  const [idTouched, setIdTouched] = useState(Boolean(initial));
  const [number, setNumber] = useState(initial?.number ?? "01");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [intro, setIntro] = useState(initial?.intro ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "🍽");
  const [station, setStation] = useState<Station>(initial?.station ?? "main");
  const [active, setActive] = useState(initial?.active ?? true);
  const numberRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "create" && !idTouched) {
      setId(slugify(title));
    }
  }, [title, mode, idTouched]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !id.trim()) {
      alert("Titre et identifiant requis");
      return;
    }
    onSave({
      id: id.trim(),
      number: number.trim(),
      title: title.trim(),
      subtitle: subtitle?.trim() || "",
      intro: intro?.trim() || "",
      icon: icon.trim() || "🍽",
      station,
      active,
    });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 z-50 bg-brown/60 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        className="fixed inset-x-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md sm:w-full top-8 z-50"
        role="dialog"
        aria-modal
      >
        <form
          onSubmit={submit}
          className="bg-white-warm rounded-2xl shadow-2xl border border-terracotta/30 flex flex-col max-h-[85vh]"
        >
          <div className="px-5 py-4 border-b border-terracotta/20 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown">
              {mode === "create" ? "Nouvelle catégorie" : "Modifier la catégorie"}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-brown-light hover:text-brown w-8 h-8 rounded-full flex items-center justify-center"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-4 space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <Field label="N°">
                <input
                  ref={numberRef}
                  value={number}
                  onChange={(e) => setNumber(e.target.value.slice(0, 4))}
                  className={`${fieldCls} text-center tabular-nums`}
                />
              </Field>
              <Field label="Titre" required>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Pizzas"
                  maxLength={80}
                  autoFocus
                  className={fieldCls}
                />
              </Field>
            </div>

            <Field
              label="Identifiant (slug)"
              hint="Stable — ne pas changer une fois en service."
            >
              <input
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  setIdTouched(true);
                }}
                placeholder="pizzas"
                disabled={mode === "edit"}
                maxLength={40}
                className={`${fieldCls} font-mono`}
              />
            </Field>

            <Field label="Icône">
              <div className="flex flex-wrap gap-2">
                <input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={4}
                  className={`${fieldCls} w-16 text-center text-xl`}
                />
                {ICON_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setIcon(p)}
                    className="w-10 h-10 rounded-lg bg-cream border border-terracotta/30 hover:border-gold transition text-xl"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Sous-titre" hint="Court — affiché sur la page carte.">
              <input
                value={subtitle ?? ""}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Au feu de bois"
                maxLength={120}
                className={fieldCls}
              />
            </Field>

            <Field label="Introduction" hint="Texte éditorial long (page carte uniquement).">
              <textarea
                value={intro ?? ""}
                onChange={(e) => setIntro(e.target.value)}
                rows={2}
                maxLength={500}
                className={`${fieldCls} resize-none`}
              />
            </Field>

            <Field
              label="Station cuisine"
              hint="Vers quel KDS partent les commandes de cette catégorie."
            >
              <select
                value={station}
                onChange={(e) => setStation(e.target.value as Station)}
                className={fieldCls}
              >
                {STATION_OPTIONS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Visible">
              <button
                type="button"
                onClick={() => setActive((a) => !a)}
                className={[
                  "h-10 px-4 rounded-lg text-sm font-bold transition w-full inline-flex items-center justify-center gap-2",
                  active
                    ? "bg-green-100 text-green-700 border border-green-400"
                    : "bg-brown/10 text-brown-light border border-brown/20",
                ].join(" ")}
              >
                {active ? "✓ Catégorie visible" : "Catégorie masquée"}
              </button>
            </Field>
          </div>

          <div className="px-5 py-3 border-t border-terracotta/20 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
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
   Form primitives
   ═══════════════════════════════════════════════════════════ */

const fieldCls =
  "w-full px-3 py-2.5 rounded-lg bg-white-warm border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 placeholder:text-brown-light/40 disabled:opacity-60";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-brown-light/80 mb-1.5">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-brown-light/70">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-full text-xs font-bold transition border",
        active
          ? "bg-gold text-brown border-gold"
          : "bg-cream text-brown-light border-terracotta/30 hover:text-brown hover:border-terracotta/60",
      ].join(" ")}
    >
      {active ? "✓ " : ""}
      {label}
    </button>
  );
}
