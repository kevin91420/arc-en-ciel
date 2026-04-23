"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ALL_PLATFORMS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  type Platform,
  type PlatformCategory,
} from "@/data/platforms";

/* ─────────────────────────────────────────────────────────────
   ROI CALCULATOR — combien vous économisez avec GOURMET PACK
   Catalogue dynamique (30+ plateformes) par catégories.
   Palette: cream #FDF8F0 · brown #2C1810 · gold #B8922F
            red #C0392B · terracotta #C4956A
   ───────────────────────────────────────────────────────────── */

const PACK_PRICE = 4990;
const AMORTIZATION_MONTHS = 24;
const HOURLY_COST = 15;
const WEEKS_PER_MONTH = 4.33;

/** Commission moyenne prélevée par plateforme de livraison (%) */
const DELIVERY_COMMISSION_PER_PLATFORM = 28;

/** Catégories affichées dans le picker, dans cet ordre. */
const PICKER_CATEGORIES: PlatformCategory[] = [
  "reservation",
  "delivery",
  "pos",
  "site",
  "menu",
  "marketing",
  "loyalty",
  "reviews",
];

/** On affiche dans le picker les plateformes utiles (coût > 0 ou commission > 0). */
const PICKER_PLATFORMS: Platform[] = ALL_PLATFORMS.filter(
  (p) =>
    PICKER_CATEGORIES.includes(p.category) &&
    (p.monthly_cost_eur > 0 || (p.commission_percent ?? 0) > 0)
);

const TOTAL_AVAILABLE = PICKER_PLATFORMS.length;

/* ─── Presets ──────────────────────────────────────────────────
   Chaque preset coche une liste d'IDs préexistants.
   Les IDs référencent src/data/platforms.ts.
   ───────────────────────────────────────────────────────────── */
type Preset = { id: string; label: string; desc: string; ids: string[] };

const PRESETS: Preset[] = [
  {
    id: "bistrot",
    label: "Petit bistrot",
    desc: "Basique mais payant",
    ids: ["wix", "mailchimp", "cashpad", "zenchef"],
  },
  {
    id: "pizzeria",
    label: "Pizzeria",
    desc: "Livraison intensive",
    ids: ["wix", "mailchimp", "zelty", "thefork", "uber_eats"],
  },
  {
    id: "gastro",
    label: "Resto gastro",
    desc: "Stack premium",
    ids: [
      "squarespace",
      "sendinblue",
      "tiller",
      "sevenrooms",
      "opentable",
      "belly",
    ],
  },
];

/* ─── Utils ──────────────────────────────────────────────────── */
const fr = (n: number) =>
  Math.round(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 });

/* ─── Animated number (count-up, respects reduced-motion) ────── */
function AnimatedNumber({
  value,
  suffix = "",
  className = "",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => `${fr(v)}${suffix}`);

  useEffect(() => {
    if (prefersReduced) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [value, mv, prefersReduced]);

  return <motion.span className={className}>{rounded}</motion.span>;
}

/* ─── Slider ─────────────────────────────────────────────────── */
function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = "",
  format = fr,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  format?: (n: number) => string;
  hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <label className="text-[11px] tracking-[0.22em] uppercase text-brown-light">
          {label}
        </label>
        <span className="font-[family-name:var(--font-display)] italic text-[color:var(--color-gold)] text-xl tabular-nums">
          {format(value)}
          {suffix}
        </span>
      </div>
      <div className="relative h-8 flex items-center">
        <div
          aria-hidden
          className="absolute inset-x-0 h-[3px] rounded-full bg-[color:var(--color-terracotta-deep)]/20"
        />
        <div
          aria-hidden
          className="absolute h-[3px] rounded-full bg-[color:var(--color-gold)]"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-x-0 w-full h-8 appearance-none bg-transparent cursor-pointer slider-roi"
        />
      </div>
      {hint && (
        <p className="mt-2 text-[11px] text-brown-light/70 italic">{hint}</p>
      )}
      <style jsx>{`
        .slider-roi::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: var(--color-brown);
          border: 3px solid var(--color-gold);
          box-shadow: 0 2px 10px rgba(44, 24, 16, 0.3);
          cursor: grab;
        }
        .slider-roi::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.1);
        }
        .slider-roi::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: var(--color-brown);
          border: 3px solid var(--color-gold);
          box-shadow: 0 2px 10px rgba(44, 24, 16, 0.3);
          cursor: grab;
        }
        .slider-roi::-moz-range-thumb:active {
          cursor: grabbing;
        }
        .slider-roi:focus {
          outline: none;
        }
        .slider-roi:focus-visible::-webkit-slider-thumb {
          outline: 2px solid var(--color-gold);
          outline-offset: 3px;
        }
      `}</style>
    </div>
  );
}

/* ─── Category accordion ─────────────────────────────────────── */
function CategoryAccordion({
  category,
  platforms,
  selected,
  onToggle,
  defaultOpen,
  reducedMotion,
}: {
  category: PlatformCategory;
  platforms: Platform[];
  selected: string[];
  onToggle: (id: string) => void;
  defaultOpen?: boolean;
  reducedMotion: boolean | null;
}) {
  const [open, setOpen] = useState<boolean>(!!defaultOpen);
  const selectedCount = platforms.filter((p) => selected.includes(p.id)).length;

  if (platforms.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[color:var(--color-terracotta-deep)]/20 bg-[color:var(--color-cream,#FDF8F0)]/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[color:var(--color-gold)]/5 transition-colors"
      >
        <span
          aria-hidden
          className="text-lg leading-none"
        >
          {CATEGORY_ICONS[category]}
        </span>
        <span className="flex-1 text-sm font-semibold text-brown tracking-wide">
          {CATEGORY_LABELS[category]}
        </span>
        {selectedCount > 0 && (
          <span className="text-[10px] tracking-[0.2em] uppercase font-semibold px-2 py-1 rounded-full bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold)] tabular-nums">
            {selectedCount}
          </span>
        )}
        <span className="text-[11px] text-brown-light/70 tabular-nums shrink-0">
          {platforms.length}
        </span>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.3 }}
          className="text-brown-light"
        >
          ↓
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0 : 0.32,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 pt-1 grid sm:grid-cols-2 gap-1.5">
              {platforms.map((p) => {
                const checked = selected.includes(p.id);
                const hasCommission = (p.commission_percent ?? 0) > 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onToggle(p.id)}
                    aria-pressed={checked}
                    className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 text-left border transition-colors ${
                      checked
                        ? "border-[color:var(--color-gold)] bg-[color:var(--color-gold)]/8"
                        : "border-[color:var(--color-terracotta-deep)]/15 hover:border-[color:var(--color-terracotta-deep)]/50"
                    }`}
                  >
                    <span
                      className={`relative w-5 h-5 mt-0.5 rounded-md border-2 shrink-0 transition-colors ${
                        checked
                          ? "border-[color:var(--color-gold)] bg-[color:var(--color-gold)]"
                          : "border-[color:var(--color-terracotta-deep)]/40 bg-transparent"
                      }`}
                    >
                      <AnimatePresence>
                        {checked && (
                          <motion.svg
                            key="check"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: reducedMotion ? 0 : 0.15 }}
                            viewBox="0 0 20 20"
                            className="absolute inset-0 w-full h-full text-[color:var(--color-brown)]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path
                              d="M4 10l4 4 8-8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="text-sm leading-none">
                          {p.icon}
                        </span>
                        <span className="text-sm text-brown leading-tight font-medium truncate">
                          {p.name}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-brown-light tabular-nums">
                          {p.monthly_cost_eur > 0
                            ? `~${p.monthly_cost_eur}\u00A0€/mois`
                            : hasCommission
                              ? `${p.commission_percent}\u00A0% commission`
                              : "Gratuit"}
                        </span>
                        {p.replaced_by && (
                          <span className="text-[9px] tracking-[0.18em] uppercase px-1.5 py-0.5 rounded-full bg-[color:var(--color-terracotta-deep)]/10 text-brown-light/80 truncate max-w-[180px]">
                            {p.replaced_by}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function ROICalculator() {
  const reducedMotion = useReducedMotion();

  // Sélection de plateformes cochées
  const [selected, setSelected] = useState<string[]>([
    "thefork",
    "zelty",
    "wix",
    "mailchimp",
  ]);

  // Sliders
  const [covers, setCovers] = useState(1500);
  const [deliveryPlatforms, setDeliveryPlatforms] = useState(1);
  const [deliveryShare, setDeliveryShare] = useState(20); // % couverts livrés
  const [hoursWeek, setHoursWeek] = useState(5);
  const [avgTicket, setAvgTicket] = useState(25);
  const [detailOpen, setDetailOpen] = useState(false);

  const toggleTool = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const applyPreset = (ids: string[]) => setSelected(ids);
  const selectAll = () => setSelected(PICKER_PLATFORMS.map((p) => p.id));
  const clearAll = () => setSelected([]);

  // ─── Plateformes groupées par catégorie ────────────────────────
  const byCategory = useMemo(() => {
    const map = new Map<PlatformCategory, Platform[]>();
    for (const cat of PICKER_CATEGORIES) map.set(cat, []);
    for (const p of PICKER_PLATFORMS) {
      map.get(p.category)?.push(p);
    }
    return map;
  }, []);

  // ─── Plateformes sélectionnées (pour l'affichage live) ─────────
  const selectedPlatforms = useMemo(
    () => PICKER_PLATFORMS.filter((p) => selected.includes(p.id)),
    [selected]
  );

  // ─── Calculs ──────────────────────────────────────────────────
  const toolsMonthlyFixed = useMemo(
    () =>
      selectedPlatforms.reduce((acc, p) => acc + (p.monthly_cost_eur || 0), 0),
    [selectedPlatforms]
  );

  const revenue = covers * avgTicket; // CA mensuel
  // Couverts livrés = part de couverts × nombre de plateformes (capé à 100%)
  const deliveryCoverShare = Math.min(
    1,
    (deliveryShare / 100) * Math.max(deliveryPlatforms, 0)
  );
  const deliveryRevenue = revenue * deliveryCoverShare;
  const commissionMonthly =
    deliveryRevenue * (DELIVERY_COMMISSION_PER_PLATFORM / 100);

  const timeLostMonthly = hoursWeek * HOURLY_COST * WEEKS_PER_MONTH;

  const currentTotal = toolsMonthlyFixed + commissionMonthly + timeLostMonthly;

  const packMonthly = PACK_PRICE / AMORTIZATION_MONTHS; // ≈ 207 €
  const savingsMonthly = Math.max(currentTotal - packMonthly, 0);
  const savingsYear = savingsMonthly * 12;
  const savings3Years = savingsMonthly * 36;

  const breakevenMonths =
    savingsMonthly > 0 ? Math.max(1, Math.ceil(PACK_PRICE / savingsMonthly)) : 99;
  const breakevenCapped = Math.min(breakevenMonths, 24);
  const breakevenPct = Math.min(
    100,
    ((24 - breakevenCapped) / 24) * 100 + 4
  );

  return (
    <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
      {/* ─── Header ─── */}
      <div className="max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl lg:text-[64px] leading-[1.05] text-brown mt-6"
        >
          Combien vous{" "}
          <em className="text-[color:var(--color-red)]">économisez</em>
          <br />
          avec{" "}
          <span className="text-[color:var(--color-gold)]">GOURMET PACK</span> ?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 text-lg lg:text-xl text-brown-light max-w-xl"
        >
          Cochez vos outils actuels. Un seul pack les remplace tous.
        </motion.p>

        {/* Headline count badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-6 inline-flex items-center gap-3 rounded-full border border-[color:var(--color-gold)]/40 bg-[color:var(--color-gold)]/10 px-5 py-2"
        >
          <span className="w-2 h-2 rounded-full bg-[color:var(--color-gold)] animate-pulse" />
          <span className="text-sm text-brown">
            Vous remplacez{" "}
            <span className="font-[family-name:var(--font-display)] italic text-[color:var(--color-gold)] text-lg tabular-nums">
              <AnimatedNumber value={selectedPlatforms.length} />
            </span>{" "}
            outil{selectedPlatforms.length > 1 ? "s" : ""}{" "}
            <span className="text-brown-light">
              (sur {TOTAL_AVAILABLE}+ disponibles)
            </span>
          </span>
        </motion.div>
      </div>

      {/* ─── Grid ─── */}
      <div className="mt-14 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-8 lg:gap-12 items-start">
        {/* ─── Form (left) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[2rem] p-7 sm:p-9 lg:p-10 bg-[color:var(--color-white-warm)] border border-[color:var(--color-terracotta-deep)]/15 shadow-[0_20px_60px_-20px_rgba(44,24,16,0.12)]"
        >
          <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--color-gold)]">
            Votre situation actuelle
          </div>

          {/* ─── Presets ─── */}
          <div className="mt-7">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <label className="text-[11px] tracking-[0.22em] uppercase text-brown-light">
                Préréglages rapides
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[10px] tracking-[0.18em] uppercase text-brown-light hover:text-[color:var(--color-gold)] transition-colors"
                >
                  Tout
                </button>
                <span className="text-brown-light/30">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] tracking-[0.18em] uppercase text-brown-light hover:text-[color:var(--color-red)] transition-colors"
                >
                  Effacer
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => {
                const active =
                  preset.ids.length === selected.length &&
                  preset.ids.every((id) => selected.includes(id));
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.ids)}
                    className={`relative text-left rounded-2xl p-3.5 border transition-all ${
                      active
                        ? "border-[color:var(--color-gold)] bg-[color:var(--color-gold)]/8"
                        : "border-[color:var(--color-terracotta-deep)]/20 hover:border-[color:var(--color-terracotta-deep)]/50"
                    }`}
                  >
                    <div
                      className={`font-[family-name:var(--font-display)] text-[17px] leading-tight ${
                        active ? "text-[color:var(--color-gold)]" : "text-brown"
                      }`}
                    >
                      {preset.label}
                    </div>
                    <div className="text-[10px] text-brown-light/80 mt-1 leading-tight">
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Tools picker (accordions) ─── */}
          <div className="mt-10">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <label className="text-[11px] tracking-[0.22em] uppercase text-brown-light">
                Quels outils payez-vous&nbsp;?
              </label>
              <span className="text-[10px] tracking-[0.18em] uppercase text-brown-light/60 tabular-nums">
                {selected.length}/{TOTAL_AVAILABLE}
              </span>
            </div>
            <div className="space-y-2">
              {PICKER_CATEGORIES.map((cat, idx) => {
                const list = byCategory.get(cat) ?? [];
                if (list.length === 0) return null;
                const selectedInCat = list.some((p) => selected.includes(p.id));
                return (
                  <CategoryAccordion
                    key={cat}
                    category={cat}
                    platforms={list}
                    selected={selected}
                    onToggle={toggleTool}
                    defaultOpen={idx < 2 || selectedInCat}
                    reducedMotion={reducedMotion}
                  />
                );
              })}
            </div>

            {/* Live chips (selected platforms) */}
            <AnimatePresence>
              {selectedPlatforms.length > 0 && (
                <motion.div
                  layout={!reducedMotion}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 flex flex-wrap gap-1.5"
                >
                  {selectedPlatforms.map((p) => (
                    <motion.span
                      key={p.id}
                      layout={!reducedMotion}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-gold)]/30 bg-[color:var(--color-gold)]/10 px-2.5 py-1 text-[11px] text-brown"
                    >
                      <span aria-hidden>{p.icon}</span>
                      <span className="truncate max-w-[120px]">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleTool(p.id)}
                        aria-label={`Retirer ${p.name}`}
                        className="text-brown-light/60 hover:text-[color:var(--color-red)] transition-colors"
                      >
                        ×
                      </button>
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Sliders ─── */}
          <div className="mt-10">
            <Slider
              label="Couverts par mois"
              value={covers}
              onChange={setCovers}
              min={100}
              max={5000}
              step={50}
            />
          </div>

          <div className="mt-8">
            <Slider
              label="Plateformes de livraison utilisées"
              value={deliveryPlatforms}
              onChange={setDeliveryPlatforms}
              min={0}
              max={3}
              step={1}
              suffix={deliveryPlatforms > 1 ? " plateformes" : " plateforme"}
              format={(n) => n.toFixed(0)}
              hint={`≈ ${DELIVERY_COMMISSION_PER_PLATFORM}\u00A0% de commission · Uber Eats, Deliveroo, Just Eat…`}
            />
          </div>

          {deliveryPlatforms > 0 && (
            <div className="mt-8">
              <Slider
                label="Part de vos couverts en livraison"
                value={deliveryShare}
                onChange={setDeliveryShare}
                min={0}
                max={60}
                step={1}
                suffix={"\u00A0%"}
                format={(n) => n.toFixed(0)}
              />
            </div>
          )}

          <div className="mt-8">
            <Slider
              label="Heures/semaine à gérer les outils"
              value={hoursWeek}
              onChange={setHoursWeek}
              min={0}
              max={20}
              step={1}
              suffix="h"
              format={(n) => n.toFixed(0)}
              hint="Valorisé à 15&nbsp;€/h (temps gérant)"
            />
          </div>

          <div className="mt-8">
            <Slider
              label="Ticket moyen"
              value={avgTicket}
              onChange={setAvgTicket}
              min={10}
              max={60}
              step={1}
              suffix={"\u00A0€"}
            />
          </div>
        </motion.div>

        {/* ─── Results (right) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:sticky lg:top-24 flex flex-col gap-4"
        >
          {/* Card 1 — Current cost */}
          <div
            className="relative rounded-[1.8rem] p-7 sm:p-8 overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, rgba(192,57,43,0.95), rgba(192,57,43,0.82))",
              color: "var(--color-white-warm)",
            }}
          >
            <div
              aria-hidden
              className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl"
              style={{ background: "rgba(255,253,249,0.08)" }}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="text-[10px] tracking-[0.3em] uppercase opacity-80">
                  Coût actuel
                </div>
                <div className="text-[10px] tracking-[0.2em] uppercase opacity-60">
                  /mois
                </div>
              </div>
              <div className="mt-4 font-[family-name:var(--font-display)] text-5xl lg:text-6xl leading-none tabular-nums">
                <AnimatedNumber value={currentTotal} suffix={"\u00A0€"} />
              </div>
              <div className="mt-5 space-y-1.5 text-sm opacity-90">
                <div className="flex items-baseline justify-between gap-4">
                  <span>
                    Abonnements ({selectedPlatforms.length} outil
                    {selectedPlatforms.length > 1 ? "s" : ""})
                  </span>
                  <span className="tabular-nums">
                    <AnimatedNumber
                      value={toolsMonthlyFixed}
                      suffix={"\u00A0€"}
                    />
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span>+ Commissions livraison</span>
                  <span className="tabular-nums">
                    <AnimatedNumber
                      value={commissionMonthly}
                      suffix={"\u00A0€"}
                    />
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span>+ Temps perdu</span>
                  <span className="tabular-nums">
                    <AnimatedNumber
                      value={timeLostMonthly}
                      suffix={"\u00A0€"}
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 — With pack */}
          <div className="relative rounded-[1.8rem] p-7 sm:p-8 bg-[color:var(--color-brown)] text-white-warm overflow-hidden">
            <div
              aria-hidden
              className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full blur-3xl"
              style={{ background: "rgba(184,146,47,0.2)" }}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="text-[10px] tracking-[0.3em] uppercase text-[color:var(--color-gold-light)]">
                  Avec Gourmet Pack
                </div>
                <div className="text-[10px] tracking-[0.2em] uppercase opacity-60">
                  /mois
                </div>
              </div>
              <div className="mt-4 font-[family-name:var(--font-display)] text-5xl lg:text-6xl leading-none tabular-nums text-[color:var(--color-gold-light)]">
                {fr(packMonthly)}&nbsp;€
              </div>
              <div className="mt-5 space-y-1.5 text-sm text-white-warm/80">
                <div className="flex items-baseline justify-between gap-4">
                  <span>4&nbsp;990&nbsp;€ une fois</span>
                  <span className="text-white-warm/60">amorti 24&nbsp;mois</span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span>Commissions plateformes</span>
                  <span className="tabular-nums font-semibold text-[color:var(--color-gold-light)]">
                    0&nbsp;€
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span>Temps perdu (tout unifié)</span>
                  <span className="tabular-nums font-semibold text-[color:var(--color-gold-light)]">
                    0&nbsp;€
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 — Savings (headline) */}
          <div
            className="relative rounded-[1.8rem] p-7 sm:p-9 overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, #B8922F 0%, #D4B058 55%, #B8922F 100%)",
              color: "var(--color-brown)",
              boxShadow: "0 30px 80px -20px rgba(184,146,47,0.5)",
            }}
          >
            <div
              aria-hidden
              className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl"
              style={{ background: "rgba(255,253,249,0.25)" }}
            />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="text-[10px] tracking-[0.3em] uppercase opacity-80">
                  Vos économies
                </div>
                <div className="flex-1 h-px bg-[color:var(--color-brown)]/20" />
              </div>

              <div className="mt-5">
                <div className="text-sm opacity-80">
                  ≈ économisés chaque mois
                </div>
                <div className="mt-1 font-[family-name:var(--font-display)] italic text-[56px] sm:text-7xl lg:text-[88px] leading-[0.95] tabular-nums">
                  <AnimatedNumber
                    value={savingsMonthly}
                    suffix={"\u00A0€"}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 pt-5 border-t border-[color:var(--color-brown)]/15">
                <div>
                  <div className="text-[10px] tracking-[0.25em] uppercase opacity-70">
                    Sur 1 an
                  </div>
                  <div className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl tabular-nums">
                    <AnimatedNumber value={savingsYear} suffix={"\u00A0€"} />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] tracking-[0.25em] uppercase opacity-70">
                    Sur 3 ans
                  </div>
                  <div className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl tabular-nums">
                    <AnimatedNumber
                      value={savings3Years}
                      suffix={"\u00A0€"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4 — Breakeven */}
          <div className="relative rounded-[1.8rem] p-7 sm:p-8 bg-[color:var(--color-white-warm)] border border-[color:var(--color-terracotta-deep)]/20">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] tracking-[0.3em] uppercase text-brown-light">
                Retour sur investissement
              </div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-brown-light/60">
                4&nbsp;990&nbsp;€
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <div className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl text-brown tabular-nums">
                {breakevenMonths > 24 ? "+24" : breakevenMonths}
              </div>
              <div className="text-brown-light">
                {breakevenMonths > 24 ? "mois+" : "mois"} pour être amorti
              </div>
            </div>

            <div className="mt-5">
              <div className="relative h-3 rounded-full bg-[color:var(--color-terracotta-deep)]/15 overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--color-gold), var(--color-gold-light))",
                  }}
                  animate={{ width: `${breakevenPct}%` }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.7,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] tracking-[0.2em] uppercase text-brown-light/60">
                <span>Aujourd&apos;hui</span>
                <span>Amorti</span>
                <span>24&nbsp;mois</span>
              </div>
            </div>

            {/* Detail expandable */}
            <button
              type="button"
              onClick={() => setDetailOpen((v) => !v)}
              aria-expanded={detailOpen}
              className="mt-6 w-full flex items-center justify-between gap-3 text-left text-sm text-brown-light hover:text-brown transition-colors"
            >
              <span className="tracking-wide">
                {detailOpen ? "Masquer" : "Voir"} le détail du calcul
              </span>
              <motion.span
                animate={{ rotate: detailOpen ? 180 : 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.3 }}
                aria-hidden
              >
                ↓
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {detailOpen && (
                <motion.div
                  key="detail"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.35,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="overflow-hidden"
                >
                  <dl className="mt-4 pt-4 border-t border-[color:var(--color-terracotta-deep)]/15 space-y-2 text-sm text-brown-light">
                    <div className="flex justify-between gap-4">
                      <dt>CA mensuel estimé</dt>
                      <dd className="tabular-nums text-brown">
                        {fr(revenue)}&nbsp;€
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>
                        {selectedPlatforms.length} abonnement
                        {selectedPlatforms.length > 1 ? "s" : ""} cumulé
                        {selectedPlatforms.length > 1 ? "s" : ""}
                      </dt>
                      <dd className="tabular-nums text-brown">
                        {fr(toolsMonthlyFixed)}&nbsp;€
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>
                        Livraison ({deliveryPlatforms}×{deliveryShare}% couverts
                        × {DELIVERY_COMMISSION_PER_PLATFORM}%)
                      </dt>
                      <dd className="tabular-nums text-brown">
                        {fr(commissionMonthly)}&nbsp;€
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>
                        Temps perdu ({hoursWeek}h × 15&nbsp;€ × 4,33)
                      </dt>
                      <dd className="tabular-nums text-brown">
                        {fr(timeLostMonthly)}&nbsp;€
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 pt-2 border-t border-[color:var(--color-terracotta-deep)]/15">
                      <dt className="text-brown font-semibold">
                        Total actuel /mois
                      </dt>
                      <dd className="tabular-nums text-brown font-semibold">
                        {fr(currentTotal)}&nbsp;€
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Pack amorti (4&nbsp;990 / 24)</dt>
                      <dd className="tabular-nums text-brown">
                        {fr(packMonthly)}&nbsp;€
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 pt-2 border-t border-[color:var(--color-terracotta-deep)]/15">
                      <dt className="text-[color:var(--color-gold)] font-semibold">
                        Économie mensuelle
                      </dt>
                      <dd className="tabular-nums text-[color:var(--color-gold)] font-semibold">
                        {fr(savingsMonthly)}&nbsp;€
                      </dd>
                    </div>
                  </dl>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CTA */}
          <a
            href="#contact"
            className="group relative mt-2 inline-flex items-center justify-center gap-3 w-full rounded-full bg-[color:var(--color-brown)] text-white-warm px-8 py-5 text-base sm:text-lg font-semibold overflow-hidden"
          >
            <span className="relative z-10">
              Demander un devis personnalisé
            </span>
            <span
              aria-hidden
              className="relative z-10 transition-transform group-hover:translate-x-1"
            >
              →
            </span>
            <span className="absolute inset-0 bg-[color:var(--color-red)] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
