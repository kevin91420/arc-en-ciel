"use client";

/* ═══════════════════════════════════════════════════════════
   /admin/economies — Dashboard « Mes économies »
   ───────────────────────────────────────────────────────────
   Lecture seule. Calcule en temps réel ce que le restaurant
   économise grâce au pack GOURMET par rapport à sa stack
   précédente (platform_ids stockés dans localStorage).

   Flow :
    1. Lit localStorage["gourmet-replaced"] (array de platform ids)
    2. Si vide  → CTA « Configurer votre ancien stack »
    3. Sinon    → 5 sections (headline, timeline, détail, before/after, share)

   Le prix du pack est un one-shot 4 990 € HT (cf. /pro page) ;
   l'amortissement est calculé sur les économies mensuelles.
   ═══════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { motion, useInView } from "framer-motion";
import {
  ALL_PLATFORMS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  type Platform,
  type PlatformCategory,
} from "@/data/platforms";

/* Coût one-shot HT du Gourmet Pack — source : /pro page */
const PACK_ONESHOT_EUR = 4990;

const STORAGE_KEY = "gourmet-replaced";

/* Format helpers (fr-FR) */
const fmtEur = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR")} €`;
const fmtMonths = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/* ─────────────────────────────────────────────────────────── */

/** Subscribe to a localStorage key change.
 *  `storage` events only fire cross-tab, which is fine for our sync. */
function subscribeReplacedStorage(onStoreChange: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function readReplacedSnapshot(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return "[]";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return "[]";
    return JSON.stringify(parsed.filter((x) => typeof x === "string"));
  } catch {
    return "[]";
  }
}

/** Returns the parsed localStorage array on the client, null on the server.
 *  Uses useSyncExternalStore so reading localStorage doesn't trigger a
 *  cascading setState in an effect (React 19 lint rule). */
function useReplacedIds(): string[] | null {
  const snap = useSyncExternalStore<string | null>(
    subscribeReplacedStorage,
    readReplacedSnapshot,
    /* SSR snapshot: null — we render a loader until hydration. */
    () => null
  );
  if (snap === null) return null;
  try {
    const v = JSON.parse(snap);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default function EconomiesPage() {
  const replacedIds = useReplacedIds();

  /* Resolve the platform objects we actually know about */
  const replacedPlatforms = useMemo<Platform[]>(() => {
    if (!replacedIds) return [];
    const byId = new Map(ALL_PLATFORMS.map((p) => [p.id, p]));
    return replacedIds
      .map((id) => byId.get(id))
      .filter((p): p is Platform => Boolean(p));
  }, [replacedIds]);

  const monthlySavings = useMemo(
    () => replacedPlatforms.reduce((s, p) => s + (p.monthly_cost_eur || 0), 0),
    [replacedPlatforms]
  );
  const annualSavings = monthlySavings * 12;
  const paybackMonths =
    monthlySavings > 0 ? PACK_ONESHOT_EUR / monthlySavings : Infinity;

  /* Group replaced platforms by category */
  const groupedByCategory = useMemo(() => {
    const map = new Map<PlatformCategory, Platform[]>();
    for (const p of replacedPlatforms) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return Array.from(map.entries()).sort(
      (a, b) =>
        b[1].reduce((s, p) => s + p.monthly_cost_eur, 0) -
        a[1].reduce((s, p) => s + p.monthly_cost_eur, 0)
    );
  }, [replacedPlatforms]);

  /* Loading state (before localStorage read) */
  if (replacedIds === null) {
    return (
      <div className="flex items-center justify-center h-64 text-brown-light">
        Chargement…
      </div>
    );
  }

  /* Empty state — no replaced platforms yet */
  if (replacedPlatforms.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="max-w-6xl mx-auto px-1 sm:px-4 pb-10 print:px-0">
      {/* ══════════ Heading ══════════ */}
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 sm:mb-10"
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl sm:text-2xl mb-1">
          Retour sur investissement
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-brown leading-tight">
          Mes économies
        </h1>
        <p className="text-brown-light/80 max-w-2xl mt-3 text-sm sm:text-base">
          Calcul en temps réel vs votre stack précédent.
        </p>
      </motion.header>

      {/* ══════════ Section 1 — Grand compteur ══════════ */}
      <HeadlineCounter
        monthly={monthlySavings}
        annual={annualSavings}
        paybackMonths={paybackMonths}
      />

      {/* ══════════ Section 2 — Timeline ══════════ */}
      <SavingsTimeline monthly={monthlySavings} />

      {/* ══════════ Section 3 — Détail par catégorie ══════════ */}
      <section className="mt-12 sm:mt-16">
        <SectionTitle
          kicker="Où l'argent était"
          title="Détail par catégorie"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {groupedByCategory.map(([cat, items], i) => (
            <CategoryCard key={cat} cat={cat} items={items} delay={i * 0.06} />
          ))}
        </div>
      </section>

      {/* ══════════ Section 4 — Chronologie avant / après ══════════ */}
      <BeforeAfter
        count={replacedPlatforms.length}
        monthly={monthlySavings}
      />

      {/* ══════════ Section 5 — CTA partage ══════════ */}
      <ShareSection
        monthly={monthlySavings}
        annual={annualSavings}
        paybackMonths={paybackMonths}
      />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═════════════════════════════════════════════════════════════ */

function EmptyState() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="font-[family-name:var(--font-script)] text-gold text-xl mb-2">
          Retour sur investissement
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-brown mb-4">
          Mes économies
        </h1>
        <p className="text-brown-light/80 mb-8">
          Pour calculer ce que vous économisez, cochez les plateformes que vous
          payiez <em>avant</em> le pack. Le calcul se met à jour automatiquement.
        </p>

        <div className="rounded-3xl bg-white-warm border border-terracotta/20 p-8 shadow-sm">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gold/15 flex items-center justify-center text-2xl mb-4">
            💰
          </div>
          <p className="text-sm text-brown-light/80 max-w-md mx-auto mb-6">
            Rendez-vous dans <strong>Intégrations</strong> — onglet{" "}
            <strong>« Remplacés »</strong> — pour sélectionner votre ancien
            stack (TheFork, Zelty, Mailchimp, etc.).
          </p>
          <Link
            href="/admin/integrations"
            className="inline-flex items-center gap-2 bg-brown hover:bg-brown/90 text-cream font-bold px-6 py-3 rounded-full transition active:scale-95"
          >
            Configurer votre ancien stack
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Grand compteur ─────────────────────────────────────── */
function HeadlineCounter({
  monthly,
  annual,
  paybackMonths,
}: {
  monthly: number;
  annual: number;
  paybackMonths: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="relative rounded-[32px] overflow-hidden bg-brown text-cream shadow-2xl"
    >
      {/* Glow background */}
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: "#B8922F" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-20 w-[360px] h-[360px] rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: "#C4956A" }}
      />

      <div className="relative px-6 sm:px-10 py-10 sm:py-14 text-center">
        <p className="text-[10px] sm:text-xs tracking-[0.35em] uppercase text-gold-light/80 font-bold">
          Vous économisez
        </p>

        <div className="mt-4 flex items-baseline justify-center gap-2 sm:gap-3 flex-wrap">
          <span
            className="font-[family-name:var(--font-display)] italic text-gold-light leading-none"
            style={{ fontSize: "clamp(3.5rem, 14vw, 7.5rem)" }}
          >
            <CountUp to={monthly} />
          </span>
          <span className="font-[family-name:var(--font-display)] text-gold-light/80 text-2xl sm:text-4xl">
            €
          </span>
          <span className="text-cream/70 text-base sm:text-xl ml-1">
            / mois
          </span>
        </div>

        <p className="mt-5 text-cream/80 text-sm sm:text-base">
          soit{" "}
          <span className="text-gold-light font-bold">
            <CountUp to={annual} /> €
          </span>{" "}
          / an
        </p>

        {/* Pack amorti */}
        <div className="mt-8 inline-flex items-center gap-3 bg-cream/10 backdrop-blur border border-cream/15 rounded-full pl-4 pr-5 py-2.5">
          <span className="w-2 h-2 rounded-full bg-gold-light animate-pulse" />
          <span className="text-[11px] sm:text-xs uppercase tracking-[0.2em] font-bold text-cream/90">
            Pack amorti en{" "}
            <span className="text-gold-light">
              {Number.isFinite(paybackMonths)
                ? `${fmtMonths(paybackMonths)} mois`
                : "—"}
            </span>
          </span>
        </div>

        <p className="mt-4 text-[11px] text-cream/50 italic">
          Base : pack one-shot {fmtEur(PACK_ONESHOT_EUR)} HT
        </p>
      </div>
    </motion.section>
  );
}

/* ─── Count-up ─────────────────────────────────────────────── */
function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); /* easeOutCubic */
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(from + (to - from) * ease(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, inView]);

  return (
    <span ref={ref}>{value.toLocaleString("fr-FR")}</span>
  );
}

/* ─── Timeline ─────────────────────────────────────────────── */
function SavingsTimeline({ monthly }: { monthly: number }) {
  const milestones = [
    { label: "Aujourd'hui", months: 0 },
    { label: "Dans 6 mois", months: 6 },
    { label: "Dans 1 an", months: 12 },
    { label: "Dans 2 ans", months: 24 },
  ];
  const max = monthly * 24;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.5 }}
      className="mt-12 sm:mt-16"
    >
      <SectionTitle
        kicker="Projection"
        title={`Votre cagnotte dans 2 ans : ${fmtEur(max)}`}
      />

      <div className="mt-6 p-6 sm:p-8 rounded-3xl bg-white-warm border border-terracotta/20">
        {/* Horizontal progress bar */}
        <div className="relative h-3 rounded-full bg-cream overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #B8922F 0%, #D4AF58 50%, #B8922F 100%)",
            }}
          />
        </div>

        {/* Milestones */}
        <ul className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {milestones.map((m, i) => {
            const cumul = monthly * m.months;
            return (
              <motion.li
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="relative"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gold shadow-[0_0_0_4px_rgba(184,146,47,0.15)]" />
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brown-light/70">
                    {m.label}
                  </p>
                </div>
                <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-brown leading-none">
                  {fmtEur(cumul)}
                </p>
                {m.months > 0 && monthly > 0 && cumul >= PACK_ONESHOT_EUR && (
                  <p className="mt-1 text-[11px] text-green-700 font-semibold">
                    ✓ Pack remboursé
                  </p>
                )}
              </motion.li>
            );
          })}
        </ul>
      </div>
    </motion.section>
  );
}

/* ─── Category card ───────────────────────────────────────── */
function CategoryCard({
  cat,
  items,
  delay,
}: {
  cat: PlatformCategory;
  items: Platform[];
  delay: number;
}) {
  const total = items.reduce((s, p) => s + p.monthly_cost_eur, 0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: 0.4, delay }}
      className="group relative rounded-2xl bg-white-warm border border-terracotta/20 p-5 hover:border-gold/50 transition-colors flex flex-col"
    >
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-cream border border-terracotta/20 flex items-center justify-center text-xl">
            {CATEGORY_ICONS[cat]}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-brown-light/60">
              Catégorie
            </p>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brown leading-tight">
              {CATEGORY_LABELS[cat]}
            </h3>
          </div>
        </div>
      </header>

      <ul className="space-y-1.5 flex-1">
        {items.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="flex items-center gap-2 text-brown truncate">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.brand_color ?? "#C0392B" }}
              />
              <span className="truncate">{p.name}</span>
            </span>
            <span className="text-xs text-brown-light font-mono flex-shrink-0">
              {p.monthly_cost_eur > 0 ? `${p.monthly_cost_eur} €` : "—"}
            </span>
          </li>
        ))}
      </ul>

      <footer className="mt-4 pt-3 border-t border-terracotta/15 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest font-bold text-brown-light/60">
          Total mensuel
        </span>
        <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-gold">
          {fmtEur(total)}
        </span>
      </footer>
    </motion.article>
  );
}

/* ─── Before / After ──────────────────────────────────────── */
function BeforeAfter({
  count,
  monthly,
}: {
  count: number;
  monthly: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.5 }}
      className="mt-12 sm:mt-16"
    >
      <SectionTitle kicker="Chronologie" title="Votre stack, avant & après" />

      <div className="mt-6 rounded-3xl border border-terracotta/20 bg-gradient-to-br from-cream/60 to-white-warm p-6 sm:p-10 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-10">
        {/* Avant */}
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-red-dark/80 mb-2">
            Avant
          </p>
          <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-brown leading-tight">
            {count} abonnement{count > 1 ? "s" : ""}
          </p>
          <p className="text-brown-light mt-1 text-sm">
            cumul :{" "}
            <span className="font-bold text-brown">{fmtEur(monthly)}</span> /
            mois
          </p>
          <p className="mt-3 text-xs text-brown-light/70 italic">
            Factures éparpillées, multi-identifiants, données isolées.
          </p>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <div className="hidden md:flex flex-col items-center gap-2">
            <svg
              viewBox="0 0 48 24"
              className="w-16 h-8 text-gold"
              fill="none"
              aria-hidden
            >
              <path
                d="M2 12h42m0 0l-8-8m8 8l-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[10px] uppercase tracking-widest font-bold text-gold">
              Gourmet Pack
            </span>
          </div>
          <div className="md:hidden flex items-center gap-2 text-gold">
            <span className="text-[10px] uppercase tracking-widest font-bold">
              Gourmet Pack
            </span>
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 rotate-90"
              fill="none"
              aria-hidden
            >
              <path
                d="M5 12h14m0 0l-6-6m6 6l-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Après */}
        <div className="md:text-right">
          <p className="text-[10px] uppercase tracking-widest font-bold text-green-700 mb-2">
            Maintenant
          </p>
          <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-brown leading-tight">
            1 pack · amorti
          </p>
          <p className="text-brown-light mt-1 text-sm">
            <span className="font-bold text-green-700">0 €</span> / mois après
            break-even
          </p>
          <p className="mt-3 text-xs text-brown-light/70 italic">
            Un seul outil, une seule facture, toutes les données réunies.
          </p>
        </div>
      </div>
    </motion.section>
  );
}

/* ─── Share / print CTA ───────────────────────────────────── */
function ShareSection({
  monthly,
  annual,
  paybackMonths,
}: {
  monthly: number;
  annual: number;
  paybackMonths: number;
}) {
  const text = `Je viens d'économiser ${fmtEur(
    monthly
  )}/mois (${fmtEur(
    annual
  )}/an) en remplaçant mon ancienne stack par GOURMET Pack. Pack amorti en ${fmtMonths(
    paybackMonths
  )} mois. 🔥`;

  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Mes économies", text });
        return;
      } catch {
        /* fallback to print */
      }
    }
    window.print();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.5 }}
      className="mt-12 sm:mt-16 print:hidden"
    >
      <div className="rounded-3xl bg-gradient-to-br from-gold/15 via-white-warm to-cream border border-gold/40 p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-1">
          <p className="font-[family-name:var(--font-script)] text-gold text-lg mb-1">
            Fier de ces chiffres ?
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown">
            Téléchargez le rapport
          </h3>
          <p className="text-brown-light/80 text-sm mt-1 max-w-md">
            Un PDF propre pour vos archives, ou à partager sur LinkedIn et
            inspirer d&apos;autres restaurateurs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={share}
            className="inline-flex items-center gap-2 bg-brown hover:bg-brown/90 text-cream font-bold px-5 py-3 rounded-full transition active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
              <path
                d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 4v12m0-12l-4 4m4-4l4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Télécharger le rapport
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-white-warm border border-terracotta/30 hover:border-gold/60 text-brown font-semibold px-4 py-3 rounded-full transition active:scale-95"
            aria-label="Imprimer la page"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
              <path
                d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2m-12 0v3h12v-3m-12 0h12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </motion.section>
  );
}

/* ─── Tiny section title ──────────────────────────────────── */
function SectionTitle({
  kicker,
  title,
}: {
  kicker: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-gold">
        {kicker}
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-brown mt-1">
        {title}
      </h2>
    </div>
  );
}
