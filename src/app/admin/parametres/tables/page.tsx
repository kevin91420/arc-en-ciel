"use client";

/**
 * /admin/parametres/tables — Configuration white-label du plan de salle.
 *
 * - Rename freely ("T1", "Terrasse 2", "Bar 3", "Snug"…)
 * - Add as many tables as needed (default 10, up to 200)
 * - Set capacity (1–20 couverts)
 * - Group by zone (Salle, Terrasse, Bar, Étage, Emporter, Livraison…)
 * - Reorder via drag handle
 *
 * Stored in `restaurant_settings.tables` as JSON. The staff floor plan
 * (/staff/tables) consumes this list — no hardcoded TABLE_COUNT anywhere.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import type {
  RestaurantSettings,
  TableConfig,
  TableShape,
} from "@/lib/db/settings-types";
import TablePlanCanvas from "@/components/TablePlanCanvas";

const ZONE_PRESETS = ["Salle", "Terrasse", "Bar", "Étage", "Privé"];

type DraftTable = TableConfig & { uid: string };

function toDraft(tables: TableConfig[]): DraftTable[] {
  return tables.map((t, i) => ({
    ...t,
    uid: `${t.number}-${i}-${Math.random().toString(36).slice(2, 8)}`,
  }));
}

function fromDraft(draft: DraftTable[]): TableConfig[] {
  return draft.map(({ uid: _uid, ...rest }) => {
    void _uid;
    return rest;
  });
}

function nextFreeNumber(tables: DraftTable[]): number {
  const used = new Set(tables.map((t) => t.number));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

export default function TablesConfigPage() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [tables, setTables] = useState<DraftTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  const selectedTable = useMemo(
    () => tables.find((t) => t.number === selectedNumber) ?? null,
    [tables, selectedNumber]
  );

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as RestaurantSettings;
      setSettings(data);
      setTables(toDraft(data.tables ?? []));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const pristine = useMemo(() => {
    if (!settings) return true;
    const cur = fromDraft(tables);
    return JSON.stringify(cur) === JSON.stringify(settings.tables ?? []);
  }, [tables, settings]);

  const updateRow = (uid: string, patch: Partial<TableConfig>) => {
    setTables((prev) =>
      prev.map((t) => (t.uid === uid ? { ...t, ...patch } : t))
    );
  };

  const removeRow = (uid: string) => {
    setTables((prev) => prev.filter((t) => t.uid !== uid));
  };

  const addRow = (zone?: string) => {
    const n = nextFreeNumber(tables);
    setTables((prev) => [
      ...prev,
      {
        uid: `new-${n}-${Math.random().toString(36).slice(2, 8)}`,
        number: n,
        label: `T${n}`,
        capacity: 4,
        zone: zone ?? "Salle",
      },
    ]);
    // Scroll to end after paint
    setTimeout(() => addBtnRef.current?.scrollIntoView({ block: "center" }), 0);
  };

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { tables: fromDraft(tables) };
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setSettings(data);
      setTables(toDraft(data.tables ?? []));
      setToast("Plan de salle enregistré ✓");
      setTimeout(() => setToast(null), 2800);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!settings) return;
    setTables(toDraft(settings.tables ?? []));
  }

  /* Group by zone for summary chips */
  const byZone = useMemo(() => {
    const g = new Map<string, number>();
    for (const t of tables) {
      const z = t.zone?.trim() || "Sans zone";
      g.set(z, (g.get(z) || 0) + 1);
    }
    return [...g.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );
  }, [tables]);

  const totalCovers = useMemo(
    () => tables.reduce((s, t) => s + (t.capacity || 0), 0),
    [tables]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* ═══════ Header ═══════ */}
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
          Plan de salle
        </h1>
        <p className="text-brown-light/80 max-w-2xl">
          Nommez vos tables comme vous voulez, ajoutez-en autant que nécessaire
          et regroupez-les par zone. Le plan staff et le POS s&apos;adaptent
          automatiquement.
        </p>
      </motion.div>

      {/* ═══════ Summary ═══════ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 rounded-2xl bg-white-warm border border-terracotta/20 p-5"
      >
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <div>
            <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown leading-none">
              {tables.length}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-1">
              Tables
            </div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown leading-none">
              {totalCovers}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mt-1">
              Couverts max
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold mb-1.5">
              Zones
            </div>
            <div className="flex flex-wrap gap-1.5">
              {byZone.map(([zone, count]) => (
                <span
                  key={zone}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/15 text-brown text-xs font-semibold"
                >
                  {zone}
                  <span className="text-brown-light/70 font-normal">
                    · {count}
                  </span>
                </span>
              ))}
              {byZone.length === 0 && (
                <span className="text-xs text-brown-light/60 italic">
                  Aucune table — ajoutez-en une pour démarrer.
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══════ Plan 2D drag&drop ═══════ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mb-6"
      >
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brown">
              Plan visuel 2D
            </h2>
            <p className="text-xs text-brown-light/80 mt-0.5">
              Glisse-dépose les tables pour reproduire ton vrai plan de
              salle. Click sur une table pour changer sa forme et capacité.
            </p>
          </div>
          {selectedTable && (
            <ShapeToolbar
              table={selectedTable}
              onShape={(shape) =>
                updateRow(selectedTable.uid, { shape })
              }
              onClear={() => setSelectedNumber(null)}
            />
          )}
        </div>
        <TablePlanCanvas
          tables={tables}
          interactive
          selectedNumber={selectedNumber}
          onSelect={setSelectedNumber}
          onMove={(number, x, y) => {
            const t = tables.find((tt) => tt.number === number);
            if (t) updateRow(t.uid, { x, y });
          }}
        />
      </motion.section>

      {/* ═══════ List ═══════ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6 rounded-3xl bg-white-warm border border-terracotta/20 overflow-hidden"
      >
        <div className="hidden sm:grid grid-cols-[auto_80px_1fr_120px_1fr_auto] gap-3 items-center px-4 py-2.5 bg-cream/60 text-[10px] uppercase tracking-widest text-brown-light/70 font-bold">
          <span className="w-5" aria-hidden />
          <span>N°</span>
          <span>Label affiché</span>
          <span>Capacité</span>
          <span>Zone</span>
          <span className="w-8 sr-only">Actions</span>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-brown-light/70">
            Chargement…
          </div>
        ) : tables.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-brown-light/80 mb-4">
              Aucune table configurée. Ajoutez votre première table.
            </p>
            <button
              type="button"
              onClick={() => addRow()}
              className="inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream text-sm font-bold px-5 py-2.5 rounded-full transition active:scale-95"
            >
              <span className="text-lg leading-none">+</span>
              Ajouter une table
            </button>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={tables}
            onReorder={setTables}
            className="divide-y divide-terracotta/10"
          >
            {tables.map((t) => (
              <Reorder.Item
                key={t.uid}
                value={t}
                className="grid grid-cols-1 sm:grid-cols-[auto_80px_1fr_120px_1fr_auto] gap-3 items-center px-4 py-3 bg-white-warm hover:bg-cream/30 transition-colors"
                whileDrag={{ scale: 1.01, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
              >
                <DragHandle />

                <div className="flex items-center gap-3 sm:gap-0">
                  <label className="sm:hidden text-[10px] uppercase tracking-wider text-brown-light/70 font-bold w-16">
                    N°
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={t.number}
                    onChange={(e) => {
                      const num = Math.max(
                        1,
                        Math.min(999, Number(e.target.value) || 1)
                      );
                      updateRow(t.uid, { number: num });
                    }}
                    className="w-full tabular-nums font-bold text-brown bg-cream border border-terracotta/30 rounded-lg px-2.5 py-2 focus:outline-none focus:border-gold text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 sm:gap-0">
                  <label className="sm:hidden text-[10px] uppercase tracking-wider text-brown-light/70 font-bold w-16">
                    Label
                  </label>
                  <input
                    type="text"
                    value={t.label}
                    onChange={(e) =>
                      updateRow(t.uid, { label: e.target.value.slice(0, 24) })
                    }
                    placeholder={`T${t.number}`}
                    className="w-full text-brown bg-white-warm border border-terracotta/30 rounded-lg px-3 py-2 focus:outline-none focus:border-gold text-sm"
                  />
                </div>

                <div className="flex items-center gap-3 sm:gap-0">
                  <label className="sm:hidden text-[10px] uppercase tracking-wider text-brown-light/70 font-bold w-16">
                    Couverts
                  </label>
                  <CapacityStepper
                    value={t.capacity}
                    onChange={(v) => updateRow(t.uid, { capacity: v })}
                  />
                </div>

                <div className="flex items-center gap-3 sm:gap-0">
                  <label className="sm:hidden text-[10px] uppercase tracking-wider text-brown-light/70 font-bold w-16">
                    Zone
                  </label>
                  <ZoneInput
                    value={t.zone ?? ""}
                    onChange={(v) => updateRow(t.uid, { zone: v || null })}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeRow(t.uid)}
                  className="self-center justify-self-end w-8 h-8 rounded-full text-brown-light hover:text-red hover:bg-red/10 transition flex items-center justify-center"
                  aria-label={`Supprimer ${t.label}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                    <path
                      d="M4 7h16m-3 0v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7m3 0V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}

        {tables.length > 0 && (
          <div className="px-4 py-3 border-t border-terracotta/10 bg-cream/30 flex flex-wrap items-center gap-2">
            <button
              ref={addBtnRef}
              type="button"
              onClick={() => addRow()}
              className="inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream text-sm font-bold px-4 py-2 rounded-full transition active:scale-95"
            >
              <span className="text-lg leading-none">+</span>
              Ajouter une table
            </button>
            <span className="text-[11px] text-brown-light/60 italic">
              Les zones sont libres — tapez ce que vous voulez.
            </span>
          </div>
        )}
      </motion.section>

      {/* ═══════ Help ═══════ */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mb-8 rounded-2xl p-5 bg-gradient-to-br from-gold/8 via-transparent to-transparent border border-gold/25 text-sm text-brown-light/90"
      >
        <div className="flex items-start gap-3">
          <span className="text-lg">💡</span>
          <div>
            <p className="text-brown font-semibold mb-1">Bon à savoir</p>
            <ul className="list-disc list-inside space-y-1 text-[13px]">
              <li>
                Le numéro de table est la référence stable (URL QR, historique
                commandes). Ne le réutilisez pas s&apos;il est associé à une
                commande active.
              </li>
              <li>
                Le label est ce que voit le serveur (« T1 », « Terrasse 2 »).
                Vous pouvez le changer à tout moment.
              </li>
              <li>
                La zone sert à filtrer le plan de salle. Laissez vide pour
                masquer du filtre.
              </li>
            </ul>
          </div>
        </div>
      </motion.section>

      {/* ═══════ Sticky save bar ═══════ */}
      <AnimatePresence>
        {!pristine && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-brown/95 backdrop-blur text-cream pl-4 pr-2 py-2 rounded-full shadow-2xl"
          >
            <span className="text-xs font-semibold pl-1">
              Modifications non enregistrées
            </span>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-cream/70 hover:text-cream px-3 py-2 rounded-full transition"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="text-xs font-bold bg-gold text-brown px-5 py-2.5 rounded-full hover:bg-gold/90 active:scale-95 transition disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Toast ═══════ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-brown text-cream px-5 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5 text-gold"
              aria-hidden
            >
              <path
                d="M5 12l5 5 9-10"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-semibold text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Error ═══════ */}
      {error && (
        <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-xs z-40 bg-red/90 text-cream px-4 py-3 rounded-xl text-sm shadow-2xl">
          {error}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ UI primitives ═══════════════════ */

function DragHandle() {
  return (
    <span
      className="hidden sm:flex justify-center cursor-grab active:cursor-grabbing text-brown-light/40 hover:text-brown transition"
      title="Glisser pour réordonner"
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <circle cx="9" cy="6" r="1.6" fill="currentColor" />
        <circle cx="9" cy="12" r="1.6" fill="currentColor" />
        <circle cx="9" cy="18" r="1.6" fill="currentColor" />
        <circle cx="15" cy="6" r="1.6" fill="currentColor" />
        <circle cx="15" cy="12" r="1.6" fill="currentColor" />
        <circle cx="15" cy="18" r="1.6" fill="currentColor" />
      </svg>
    </span>
  );
}

function CapacityStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.max(1, Math.min(20, v));
  return (
    <div className="inline-flex items-center gap-1 bg-cream border border-terracotta/30 rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        className="w-7 h-7 rounded text-brown font-bold hover:bg-terracotta/15 active:scale-95 transition"
        aria-label="Diminuer la capacité"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-bold text-brown tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        className="w-7 h-7 rounded text-brown font-bold hover:bg-terracotta/15 active:scale-95 transition"
        aria-label="Augmenter la capacité"
      >
        +
      </button>
    </div>
  );
}

function ZoneInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex-1 flex items-center gap-1 flex-wrap">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 24))}
        placeholder="Salle"
        list="zone-presets"
        className="flex-1 min-w-0 text-brown bg-white-warm border border-terracotta/30 rounded-lg px-3 py-2 focus:outline-none focus:border-gold text-sm"
      />
      <datalist id="zone-presets">
        {ZONE_PRESETS.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>
    </div>
  );
}

/* ─── Shape toolbar (canvas selection) ─── */
function ShapeToolbar({
  table,
  onShape,
  onClear,
}: {
  table: TableConfig;
  onShape: (shape: TableShape) => void;
  onClear: () => void;
}) {
  const shapes: { key: TableShape; icon: string; label: string }[] = [
    { key: "round", icon: "⬤", label: "Ronde" },
    { key: "square", icon: "■", label: "Carrée" },
    { key: "rect", icon: "▬", label: "Rectangle" },
  ];
  const current = table.shape ?? "square";
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white-warm border border-terracotta/30 px-2 py-1">
      <span className="text-[10px] uppercase tracking-wider text-brown-light/70 font-bold pl-1">
        {table.label}
      </span>
      {shapes.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onShape(s.key)}
          title={s.label}
          className={[
            "w-8 h-8 rounded-full flex items-center justify-center transition text-base",
            current === s.key
              ? "bg-brown text-cream"
              : "text-brown-light hover:text-brown hover:bg-cream",
          ].join(" ")}
        >
          {s.icon}
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="ml-1 text-[10px] uppercase tracking-wider text-brown-light/70 hover:text-brown px-2 py-1 transition"
      >
        ✕
      </button>
    </div>
  );
}
