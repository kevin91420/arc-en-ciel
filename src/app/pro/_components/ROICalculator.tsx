"use client";

import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   ROI CALCULATOR — combien vous économisez avec GOURMET PACK
   Palette: cream #FDF8F0 · brown #2C1810 · gold #B8922F
            red #C0392B · terracotta #C4956A
   ───────────────────────────────────────────────────────────── */

const PACK_PRICE = 4990;
const AMORTIZATION_MONTHS = 24;
const HOURLY_COST = 15;
const WEEKS_PER_MONTH = 4.33;

type Tool = {
  id: string;
  label: string;
  monthly: number;
};

const TOOLS: Tool[] = [
  { id: "thefork", label: "TheFork Manager", monthly: 150 },
  { id: "pos", label: "Zelty / POS autre", monthly: 200 },
  { id: "website", label: "Site web (Wix/autre)", monthly: 30 },
  { id: "email", label: "Mailchimp / emails", monthly: 50 },
  { id: "qr", label: "Menu QR externe", monthly: 40 },
  { id: "loyalty", label: "Programme fidélité", monthly: 60 },
  { id: "delivery", label: "Deliveroo Plus / Uber Eats Manager", monthly: 100 },
];

type SizeKey = "S" | "M" | "L";
const SIZES: { key: SizeKey; label: string; desc: string; mult: number }[] = [
  { key: "S", label: "Petit", desc: "moins de 40 couverts", mult: 1 },
  { key: "M", label: "Moyen", desc: "40-80 couverts", mult: 1.15 },
  { key: "L", label: "Grand", desc: "+80 couverts", mult: 1.3 },
];

const fr = (n: number) =>
  Math.round(n).toLocaleString("fr-FR", { maximumFractionDigits: 0 });

/* ─── Animated number (count-up) ─────────────────────────────── */
function AnimatedNumber({
  value,
  suffix = "",
  className = "",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => `${fr(v)}${suffix}`);

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [value, mv]);

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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  format?: (n: number) => string;
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

/* ─── Main component ─────────────────────────────────────────── */
export default function ROICalculator() {
  const [size, setSize] = useState<SizeKey>("M");
  const [selected, setSelected] = useState<string[]>([
    "thefork",
    "pos",
    "website",
  ]);
  const [covers, setCovers] = useState(1500);
  const [commission, setCommission] = useState(7);
  const [hoursWeek, setHoursWeek] = useState(5);
  const [avgTicket, setAvgTicket] = useState(25);
  const [detailOpen, setDetailOpen] = useState(false);

  const sizeMult = useMemo(
    () => SIZES.find((s) => s.key === size)?.mult ?? 1,
    [size]
  );

  const toggleTool = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // ─── Calculations ─────────────────────────────────────────────
  const toolsMonthly = useMemo(
    () =>
      TOOLS.filter((t) => selected.includes(t.id)).reduce(
        (acc, t) => acc + t.monthly,
        0
      ) * sizeMult,
    [selected, sizeMult]
  );

  const revenue = covers * avgTicket; // monthly revenue
  const commissionMonthly = revenue * (commission / 100);
  const timeLostMonthly = hoursWeek * HOURLY_COST * WEEKS_PER_MONTH;

  const currentTotal = toolsMonthly + commissionMonthly + timeLostMonthly;

  const packMonthly = PACK_PRICE / AMORTIZATION_MONTHS; // ≈ 207 €
  const savingsMonthly = Math.max(currentTotal - packMonthly, 0);
  const savingsYear = savingsMonthly * 12;
  const savings3Years = savingsMonthly * 36;

  const breakevenMonths = savingsMonthly > 0
    ? Math.max(1, Math.ceil(PACK_PRICE / savingsMonthly))
    : 99;
  const breakevenCapped = Math.min(breakevenMonths, 24);
  const breakevenPct = Math.min(100, (24 - breakevenCapped) / 24 * 100 + 4);

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
          avec <span className="text-[color:var(--color-gold)]">GOURMET PACK</span> ?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 text-lg lg:text-xl text-brown-light max-w-xl"
        >
          Calculez votre ROI en 30 secondes.
        </motion.p>
      </div>

      {/* ─── Grid ─── */}
      <div className="mt-16 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-8 lg:gap-12 items-start">
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

          {/* Q1 — Size */}
          <div className="mt-8">
            <label className="text-[11px] tracking-[0.22em] uppercase text-brown-light">
              Taille de votre restaurant
            </label>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {SIZES.map((s) => {
                const active = size === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSize(s.key)}
                    className={`relative text-left rounded-2xl p-4 border transition-all ${
                      active
                        ? "border-[color:var(--color-gold)] bg-[color:var(--color-gold)]/8"
                        : "border-[color:var(--color-terracotta-deep)]/20 hover:border-[color:var(--color-terracotta-deep)]/50"
                    }`}
                  >
                    <div
                      className={`font-[family-name:var(--font-display)] text-xl ${
                        active ? "text-[color:var(--color-gold)]" : "text-brown"
                      }`}
                    >
                      {s.label}
                    </div>
                    <div className="text-[11px] text-brown-light/80 mt-1 leading-tight">
                      {s.desc}
                    </div>
                    {active && (
                      <motion.span
                        layoutId="size-dot"
                        className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[color:var(--color-gold)]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Q2 — Tools */}
          <div className="mt-10">
            <label className="text-[11px] tracking-[0.22em] uppercase text-brown-light">
              Quels outils payez-vous aujourd&apos;hui&nbsp;?
            </label>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              {TOOLS.map((t) => {
                const checked = selected.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTool(t.id)}
                    aria-pressed={checked}
                    className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-left border transition-colors ${
                      checked
                        ? "border-[color:var(--color-gold)] bg-[color:var(--color-gold)]/8"
                        : "border-[color:var(--color-terracotta-deep)]/20 hover:border-[color:var(--color-terracotta-deep)]/50"
                    }`}
                  >
                    <span
                      className={`relative w-5 h-5 rounded-md border-2 shrink-0 transition-colors ${
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
                            transition={{ duration: 0.15 }}
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
                    <span className="flex-1 text-sm text-brown leading-tight">
                      {t.label}
                    </span>
                    <span className="text-[11px] text-brown-light tabular-nums shrink-0">
                      ~{t.monthly}&nbsp;€/mo
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Q3 — Covers */}
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

          {/* Q4 — Commission */}
          <div className="mt-8">
            <Slider
              label="Commission plateformes externes"
              value={commission}
              onChange={setCommission}
              min={0}
              max={20}
              step={1}
              suffix={"\u00A0%"}
              format={(n) => n.toFixed(0)}
            />
          </div>

          {/* Q5 — Hours lost */}
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
            />
            <p className="mt-2 text-[11px] text-brown-light/70 italic">
              Valorisé à 15&nbsp;€/h (temps gérant)
            </p>
          </div>

          {/* Q6 — Avg ticket */}
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
                  <span>Outils abonnés</span>
                  <span className="tabular-nums">
                    <AnimatedNumber value={toolsMonthly} suffix={"\u00A0€"} />
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span>+ Commissions plateformes</span>
                  <span className="tabular-nums">
                    <AnimatedNumber value={commissionMonthly} suffix={"\u00A0€"} />
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span>+ Temps perdu</span>
                  <span className="tabular-nums">
                    <AnimatedNumber value={timeLostMonthly} suffix={"\u00A0€"} />
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
                  <AnimatedNumber value={savingsMonthly} suffix={"\u00A0€"} />
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
                    <AnimatedNumber value={savings3Years} suffix={"\u00A0€"} />
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
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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
                transition={{ duration: 0.3 }}
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
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
                        Commissions ({commission}% × {fr(revenue)}&nbsp;€)
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
                    <div className="flex justify-between gap-4">
                      <dt>Outils × coefficient taille ({sizeMult.toFixed(2)})</dt>
                      <dd className="tabular-nums text-brown">
                        {fr(toolsMonthly)}&nbsp;€
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
