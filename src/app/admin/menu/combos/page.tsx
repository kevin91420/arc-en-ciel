"use client";

/**
 * /admin/menu/combos — CRUD des formules (combos).
 *
 * Une formule = un nom + un prix fixe + des "slots" qui définissent les
 * choix (ex : Entrée parmi 3, Plat parmi 5, Dessert parmi 2). Au POS, le
 * serveur tape la formule, le modal demande les choix, puis crée N order
 * lines liées par combo_id pour le ticket.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCents } from "@/lib/format";
import type {
  MenuCategoryFull,
  MenuComboFull,
  MenuComboSlotRow,
} from "@/lib/db/menu-types";

interface SlotDraft {
  label: string;
  item_ids: string[];
  min_picks: number;
  max_picks: number;
}

interface ComboDraft {
  id: string;
  card_id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  active: boolean;
  position: number;
  slots: SlotDraft[];
}

/**
 * Slugify — lowercase + strip diacritics (combining marks U+0300..U+036F)
 * + collapse non-alphanum to "-" + trim. Stable, ASCII-safe.
 *
 * IMPORTANT : on utilise les escape unicode ̀-ͯ plutôt que
 * les caractères combinants littéraux dans la regex — sinon n'importe
 * quel éditeur/transit qui normalise les chaînes peut casser la classe.
 */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export default function CombosEditorPage() {
  const [combos, setCombos] = useState<MenuComboFull[]>([]);
  const [menu, setMenu] = useState<MenuCategoryFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ComboDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [combosRes, menuRes] = await Promise.all([
        fetch("/api/admin/menu/combos", {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/menu?include_inactive=1", {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      if (!combosRes.ok) throw new Error("Combos non chargés");
      if (!menuRes.ok) throw new Error("Menu non chargé");
      const c = (await combosRes.json()) as { combos: MenuComboFull[] };
      const m = (await menuRes.json()) as MenuCategoryFull[];
      setCombos(c.combos);
      setMenu(m);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  function startCreate() {
    setEditing({
      id: "",
      card_id: "default",
      name: "",
      description: "",
      price_cents: 1800,
      image_url: "",
      active: true,
      position: 999,
      slots: [
        {
          label: "Entrée",
          item_ids: [],
          min_picks: 1,
          max_picks: 1,
        },
        {
          label: "Plat",
          item_ids: [],
          min_picks: 1,
          max_picks: 1,
        },
      ],
    });
  }

  function startEdit(combo: MenuComboFull) {
    setEditing({
      id: combo.id,
      card_id: combo.card_id,
      name: combo.name,
      description: combo.description,
      price_cents: combo.price_cents,
      image_url: combo.image_url ?? "",
      active: combo.active,
      position: combo.position,
      slots: combo.slots.map((s: MenuComboSlotRow) => ({
        label: s.label,
        item_ids: s.item_ids ?? [],
        min_picks: s.min_picks,
        max_picks: s.max_picks,
      })),
    });
  }

  async function saveCombo(draft: ComboDraft) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/menu/combos", {
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
      flashToast("Formule enregistrée ✓");
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setBusy(true);
    try {
      await fetch(`/api/admin/menu/combos/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteCombo(id: string) {
    if (!confirm("Supprimer cette formule ?")) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/menu/combos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      await refresh();
      flashToast("Formule supprimée");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link
          href="/admin/menu"
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
          Retour à la carte
        </Link>
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-1">
          Configuration
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-2">
          Formules
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          Crée des packages à prix fixe : entrée + plat + dessert, menu midi,
          formule étudiant. Chaque slot définit ce que le client choisit (ex :
          1 entrée parmi 3).
        </p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 rounded-2xl bg-white-warm border border-terracotta/20 p-5 flex items-baseline justify-between flex-wrap gap-4"
      >
        <div>
          <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown leading-none">
            {combos.length}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-1">
            Formules configurées
          </div>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream text-sm font-bold px-4 py-2.5 rounded-full transition active:scale-95"
        >
          <span className="text-lg leading-none">+</span>
          Nouvelle formule
        </button>
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

      {!loading && combos.length === 0 && (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-terracotta/30 bg-white-warm/30">
          <div className="text-5xl mb-3" aria-hidden>
            🍽
          </div>
          <p className="text-brown-light max-w-md mx-auto px-4">
            Aucune formule pour le moment. Crée ta première : « Menu Midi »,
            « Formule complète »…
          </p>
          <button
            type="button"
            onClick={startCreate}
            className="mt-5 inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream text-sm font-bold px-5 py-2.5 rounded-full transition active:scale-95"
          >
            Créer ma 1ère formule
          </button>
        </div>
      )}

      {!loading && combos.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {combos.map((c) => (
            <ComboCard
              key={c.id}
              combo={c}
              onEdit={() => startEdit(c)}
              onToggle={() => toggleActive(c.id, !c.active)}
              onDelete={() => deleteCombo(c.id)}
            />
          ))}
        </ul>
      )}

      <AnimatePresence>
        {editing && (
          <ComboEditModal
            draft={editing}
            menu={menu}
            busy={busy}
            onCancel={() => setEditing(null)}
            onChange={setEditing}
            onSave={() => saveCombo(editing)}
          />
        )}
      </AnimatePresence>

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
   Combo card
   ═══════════════════════════════════════════════════════════ */

function ComboCard({
  combo,
  onEdit,
  onToggle,
  onDelete,
}: {
  combo: MenuComboFull;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.li
      layout
      className={[
        "rounded-2xl border p-5 transition",
        combo.active
          ? "bg-white-warm border-terracotta/20"
          : "bg-cream/40 border-terracotta/15 opacity-70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown leading-tight">
              {combo.name}
            </h3>
            {!combo.active && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-brown/20 text-brown px-1.5 py-0.5 rounded">
                Off
              </span>
            )}
          </div>
          <p className="text-xs text-brown-light/80 mt-0.5 line-clamp-2">
            {combo.description || "Pas de description"}
          </p>
        </div>
        <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-gold tabular-nums flex-shrink-0">
          {formatCents(combo.price_cents)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {combo.slots.map((s, i) => (
          <span
            key={i}
            className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide bg-cream text-brown px-2 py-0.5 rounded border border-terracotta/30"
          >
            {s.label} ({s.item_ids?.length ?? 0})
          </span>
        ))}
        {combo.slots.length === 0 && (
          <span className="text-[10px] text-amber-700 italic">
            ⚠ Aucun slot configuré
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brown hover:text-gold transition"
        >
          ✎ Modifier
        </button>
        <span className="text-brown-light/30">·</span>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brown-light hover:text-brown transition"
        >
          {combo.active ? "Désactiver" : "Activer"}
        </button>
        <span className="text-brown-light/30 ml-auto">·</span>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brown-light hover:text-red transition"
        >
          ✕ Supprimer
        </button>
      </div>
    </motion.li>
  );
}

/* ═══════════════════════════════════════════════════════════
   Combo edit modal
   ═══════════════════════════════════════════════════════════ */

function ComboEditModal({
  draft,
  menu,
  busy,
  onCancel,
  onChange,
  onSave,
}: {
  draft: ComboDraft;
  menu: MenuCategoryFull[];
  busy: boolean;
  onCancel: () => void;
  onChange: (next: ComboDraft) => void;
  onSave: () => void;
}) {
  const [idTouched, setIdTouched] = useState(Boolean(draft.id));
  const [validationError, setValidationError] = useState<string | null>(null);

  /* Auto-sync slug ← name pendant que l'utilisateur tape, mais SEULEMENT
   * tant qu'il n'a pas édité manuellement le slug. Sans ça, on tombait
   * dans un état où le slug ne se générait qu'une fois (au 1er char) et
   * stagnait à "m" alors que le nom devenait "Menu midi".
   *
   * Note : on dépend uniquement de [draft.name, idTouched]. Inclure
   * `draft` ou `onChange` créerait une boucle infinie via le setState.
   */
  useEffect(() => {
    if (idTouched) return;
    const next = slugify(draft.name);
    if (next === draft.id) return;
    onChange({ ...draft, id: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.name, idTouched]);

  function update(patch: Partial<ComboDraft>) {
    if (validationError) setValidationError(null);
    onChange({ ...draft, ...patch });
  }

  function updateSlot(idx: number, patch: Partial<SlotDraft>) {
    const next = draft.slots.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    update({ slots: next });
  }

  function addSlot() {
    update({
      slots: [
        ...draft.slots,
        { label: "Slot " + (draft.slots.length + 1), item_ids: [], min_picks: 1, max_picks: 1 },
      ],
    });
  }

  function removeSlot(idx: number) {
    update({ slots: draft.slots.filter((_, i) => i !== idx) });
  }

  /* Flat catalogue for slot pickers. */
  const allItems = useMemo(() => {
    return menu.flatMap((c) =>
      c.items.map((it) => ({
        id: it.id,
        label: it.name,
        category_title: c.title,
        category_icon: c.icon,
        price_cents: it.price_cents,
      }))
    );
  }, [menu]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setValidationError("Le nom de la formule est obligatoire.");
      return;
    }
    if (!draft.id.trim()) {
      setValidationError("L'identifiant (slug) est obligatoire — il s'auto-remplit à partir du nom.");
      return;
    }
    if (draft.slots.length === 0) {
      setValidationError("Ajoute au moins un slot (Entrée, Plat, Dessert…).");
      return;
    }
    const badSlot = draft.slots.findIndex(
      (s) => s.item_ids.length < s.min_picks
    );
    if (badSlot >= 0) {
      const s = draft.slots[badSlot];
      setValidationError(
        `Slot « ${s.label || `n°${badSlot + 1}`} » : coche au moins ${s.min_picks} plat(s). (actuellement ${s.item_ids.length})`
      );
      return;
    }
    setValidationError(null);
    onSave();
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
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        /* Mobile : modal pleine hauteur (top-4 bottom-4) pour qu'on
         * voit toujours le footer. Desktop : centrée avec max-h-[90vh]. */
        className="fixed inset-x-4 top-4 bottom-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-2xl sm:w-[calc(100vw-2rem)] sm:max-h-[90vh] z-50 flex"
        role="dialog"
        aria-modal
      >
        <form
          onSubmit={submit}
          /* h-full + min-h-0 : la form prend toute la hauteur du wrapper,
           * et le middle (overflow-y-auto + flex-1 + min-h-0) peut shrink
           * et scroller. Sans min-h-0, flexbox refuse de réduire le
           * middle sous sa hauteur de contenu → le footer disparaît. */
          className="bg-white-warm rounded-2xl shadow-2xl border border-terracotta/30 h-full w-full flex flex-col overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-terracotta/20 flex items-center justify-between flex-shrink-0">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown">
              {draft.id ? `Modifier ${draft.name || "la formule"}` : "Nouvelle formule"}
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

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
              <Field label="Nom" required>
                <input
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Menu Midi"
                  maxLength={80}
                  autoFocus
                  className={fieldCls}
                />
              </Field>
              <Field label="Prix TTC (€)" required>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={(draft.price_cents / 100).toString()}
                  onChange={(e) =>
                    update({
                      price_cents: Math.round(
                        Number(e.target.value || 0) * 100
                      ),
                    })
                  }
                  className={`${fieldCls} tabular-nums`}
                />
              </Field>
            </div>

            <Field label="Identifiant (slug)" hint="Stable — ne pas changer une fois en service.">
              <input
                value={draft.id}
                onChange={(e) => {
                  setIdTouched(true);
                  update({ id: e.target.value });
                }}
                placeholder="menu-midi"
                className={`${fieldCls} font-mono`}
              />
            </Field>

            <Field label="Description">
              <textarea
                value={draft.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={2}
                maxLength={300}
                placeholder="1 entrée + 1 plat + 1 dessert au choix"
                className={`${fieldCls} resize-none`}
              />
            </Field>

            <Field label="Photo (URL)">
              <input
                type="url"
                value={draft.image_url}
                onChange={(e) => update({ image_url: e.target.value })}
                placeholder="https://…"
                className={fieldCls}
              />
            </Field>

            {/* ── Slots ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-brown-light/80">
                  Composantes du menu
                </label>
                <button
                  type="button"
                  onClick={addSlot}
                  className="text-xs text-brown font-bold hover:text-gold inline-flex items-center gap-1"
                >
                  <span className="text-base leading-none">+</span> Ajouter un
                  slot
                </button>
              </div>

              {draft.slots.length === 0 ? (
                <p className="text-[11px] text-brown-light/70 italic px-2 py-2">
                  Aucun slot. Ajoute au moins un (Entrée, Plat, Dessert…).
                </p>
              ) : (
                <ul className="space-y-3">
                  {draft.slots.map((s, idx) => (
                    <SlotEditor
                      key={idx}
                      slot={s}
                      allItems={allItems}
                      onChange={(patch) => updateSlot(idx, patch)}
                      onRemove={() => removeSlot(idx)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <Field label="Visible">
              <button
                type="button"
                onClick={() => update({ active: !draft.active })}
                className={[
                  "h-10 px-4 rounded-lg text-sm font-bold transition w-full inline-flex items-center justify-center gap-2",
                  draft.active
                    ? "bg-green-100 text-green-700 border border-green-400"
                    : "bg-brown/10 text-brown-light border border-brown/20",
                ].join(" ")}
              >
                {draft.active ? "✓ Visible au POS et QR menu" : "Masquée"}
              </button>
            </Field>
          </div>

          {validationError && (
            <div
              role="alert"
              className="mx-5 mb-2 rounded-lg border border-red/40 bg-red/10 text-red-dark text-xs px-3 py-2 flex items-start gap-2 flex-shrink-0"
            >
              <span aria-hidden className="text-base leading-none">⚠</span>
              <span className="font-semibold">{validationError}</span>
            </div>
          )}

          <div className="px-5 py-3 border-t border-terracotta/20 flex items-center justify-end gap-2 flex-shrink-0 bg-white-warm">
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

function SlotEditor({
  slot,
  allItems,
  onChange,
  onRemove,
}: {
  slot: SlotDraft;
  allItems: Array<{
    id: string;
    label: string;
    category_title: string;
    category_icon: string;
    price_cents: number;
  }>;
  onChange: (patch: Partial<SlotDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="rounded-xl bg-cream border border-terracotta/30 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <input
          value={slot.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Entrée"
          maxLength={40}
          className={`${fieldCls} flex-1`}
        />
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 rounded-full text-brown-light hover:text-red hover:bg-red/10 transition flex items-center justify-center"
          title="Supprimer ce slot"
        >
          ×
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-brown-light">
        <label className="inline-flex items-center gap-1.5">
          Min
          <input
            type="number"
            min={0}
            max={slot.max_picks}
            value={slot.min_picks}
            onChange={(e) =>
              onChange({
                min_picks: Math.max(
                  0,
                  Math.min(slot.max_picks, Number(e.target.value) || 0)
                ),
              })
            }
            className="w-14 px-2 py-1 rounded bg-white-warm border border-terracotta/30 text-brown text-sm tabular-nums"
          />
        </label>
        <label className="inline-flex items-center gap-1.5">
          Max
          <input
            type="number"
            min={slot.min_picks}
            max={10}
            value={slot.max_picks}
            onChange={(e) =>
              onChange({
                max_picks: Math.max(
                  slot.min_picks,
                  Math.min(10, Number(e.target.value) || slot.min_picks)
                ),
              })
            }
            className="w-14 px-2 py-1 rounded bg-white-warm border border-terracotta/30 text-brown text-sm tabular-nums"
          />
        </label>
        <span className="text-brown-light/70 italic">
          choix possibles parmi…
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {allItems.map((item) => {
          const checked = slot.item_ids.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onChange({
                  item_ids: checked
                    ? slot.item_ids.filter((id) => id !== item.id)
                    : [...slot.item_ids, item.id],
                })
              }
              className={[
                "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border transition",
                checked
                  ? "bg-brown text-cream border-brown"
                  : "bg-white-warm text-brown border-terracotta/30 hover:border-brown/50",
              ].join(" ")}
              title={`${item.category_title} · ${formatCents(item.price_cents)}`}
            >
              <span aria-hidden>{item.category_icon}</span>
              <span className="truncate max-w-[120px]">{item.label}</span>
            </button>
          );
        })}
      </div>
      {slot.item_ids.length === 0 && (
        <p className="text-[11px] text-amber-700 italic">
          ⚠ Coche au moins un plat pour ce slot.
        </p>
      )}
    </li>
  );
}

/* ═══════════════════════════════════════════════════════════
   Form primitives (mirror of /admin/menu)
   ═══════════════════════════════════════════════════════════ */

const fieldCls =
  "w-full px-3 py-2.5 rounded-lg bg-white-warm border border-terracotta/30 text-brown text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 placeholder:text-brown-light/40";

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
      <label className="block text-[10px] uppercase tracking-wider text-brown-light/80 font-bold mb-1.5">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-[11px] text-brown-light/70">{hint}</p>
      )}
    </div>
  );
}
