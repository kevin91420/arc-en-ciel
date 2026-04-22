"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type {
  LoyaltyCardFull,
  LoyaltyConfig,
  LoyaltyTransaction,
} from "@/lib/db/loyalty-types";

/* ═══════════════════════════════════════════════════════════
   WALLET CARD — Vue publique de la carte fidélité
   Mobile-first, Apple-Wallet style, PWA-friendly.
   ═══════════════════════════════════════════════════════════ */

const POLL_INTERVAL_MS = 30_000;

type FetchState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      card: LoyaltyCardFull;
      config: LoyaltyConfig;
    };

export default function CardPage({ cardNumber }: { cardNumber: string }) {
  const [state, setState] = useState<FetchState>({ kind: "loading" });
  const [copied, setCopied] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [rewardBanner, setRewardBanner] = useState(false);
  const prevStampsRef = useRef<number | null>(null);
  const prevRewardsRef = useRef<number | null>(null);

  /* ─── Fetch ─── */
  const fetchCard = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`/api/loyalty/card/${cardNumber}`, {
          cache: "no-store",
          signal,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setState({
            kind: "error",
            message:
              res.status === 404
                ? "Cette carte est introuvable."
                : data?.error || "Erreur de chargement.",
          });
          return;
        }
        const data = (await res.json()) as {
          card: LoyaltyCardFull;
          config: LoyaltyConfig;
        };
        setState({ kind: "ready", card: data.card, config: data.config });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState({
          kind: "error",
          message: "Impossible de contacter le serveur.",
        });
      }
    },
    [cardNumber]
  );

  /* Initial load + polling */
  useEffect(() => {
    const ctrl = new AbortController();
    // Defer the initial fetch so the setState happens after the effect returns.
    const initial = queueMicrotask(() => {
      if (!ctrl.signal.aborted) void fetchCard(ctrl.signal);
    });
    void initial;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchCard();
    }, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchCard();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      ctrl.abort();
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchCard]);

  /* ─── Detect stamp increase / reward ─── */
  useEffect(() => {
    if (state.kind !== "ready") return;
    const { card, config } = state;
    const prevStamps = prevStampsRef.current;
    const prevRewards = prevRewardsRef.current;

    let celebrateTimeout: number | undefined;
    let shouldCelebrate = false;
    let shouldShowReward = false;

    if (prevStamps !== null && card.current_stamps > prevStamps) {
      shouldCelebrate = true;
    }

    // Reward-earned banner: rewards_claimed increased AND stamps reset
    if (
      prevRewards !== null &&
      card.rewards_claimed > prevRewards &&
      card.current_stamps === 0
    ) {
      const key = `ace-reward-shown-${card.card_number}-${card.rewards_claimed}`;
      if (typeof window !== "undefined" && !localStorage.getItem(key)) {
        shouldShowReward = true;
        localStorage.setItem(key, "1");
      }
    }

    // Also surface when user lands on the page right after claim (first load)
    if (
      prevRewards === null &&
      card.rewards_claimed > 0 &&
      card.current_stamps === 0 &&
      card.total_stamps_earned >= config.stamps_required
    ) {
      const key = `ace-reward-shown-${card.card_number}-${card.rewards_claimed}`;
      if (typeof window !== "undefined" && !localStorage.getItem(key)) {
        shouldShowReward = true;
        localStorage.setItem(key, "1");
      }
    }

    prevStampsRef.current = card.current_stamps;
    prevRewardsRef.current = card.rewards_claimed;

    // Defer state updates out of the effect body
    if (shouldCelebrate || shouldShowReward) {
      queueMicrotask(() => {
        if (shouldCelebrate) {
          setCelebrate(true);
          celebrateTimeout = window.setTimeout(
            () => setCelebrate(false),
            2600
          );
        }
        if (shouldShowReward) setRewardBanner(true);
      });
    }

    return () => {
      if (celebrateTimeout) window.clearTimeout(celebrateTimeout);
    };
  }, [state]);

  /* ─── Copy card number ─── */
  const copyCardNumber = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cardNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [cardNumber]);

  /* ─── QR URL ─── */
  const qrUrl = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        cardNumber
      )}&margin=8&ecc=M`,
    [cardNumber]
  );

  /* ───────────── RENDER ───────────── */
  if (state.kind === "loading") {
    return <CardSkeleton />;
  }

  if (state.kind === "error") {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center bg-white-warm rounded-2xl p-10 shadow-lg border border-terracotta/20">
          <p className="font-[family-name:var(--font-script)] text-red text-2xl mb-2">
            Oh non…
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-brown text-2xl font-bold mb-4">
            {state.message}
          </h1>
          <p className="text-brown-light text-sm mb-8">
            Vérifiez le numéro de votre carte ou contactez le restaurant.
          </p>
          <Link
            href="/fidelite"
            className="inline-flex items-center gap-2 bg-brown hover:bg-brown-light text-cream font-bold px-6 py-3 rounded-full transition-colors"
          >
            Retour au programme
          </Link>
        </div>
      </div>
    );
  }

  const { card, config } = state;
  const stampsRequired = config.stamps_required || 5;
  const progress = Math.min(card.current_stamps, stampsRequired);
  const transactions = (card.transactions || []).slice(0, 5);

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop hint */}
      <div className="hidden lg:block pt-6">
        <p className="text-center text-brown-light text-xs">
          Ajoutez cette page à l&apos;écran d&apos;accueil pour l&apos;utiliser
          comme une application.
        </p>
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/fidelite"
            className="inline-flex items-center gap-2 text-brown-light hover:text-red transition-colors text-sm font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Programme fidélité
          </Link>
        </div>

        {/* ═══ Reward banner ═══ */}
        <AnimatePresence>
          {rewardBanner && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-gold via-gold-light to-gold text-brown p-5 shadow-xl shadow-gold/30"
              role="status"
            >
              <Confetti />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="font-[family-name:var(--font-script)] text-xl">
                    Félicitations !
                  </p>
                  <h2 className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight mt-1">
                    Récompense disponible
                  </h2>
                  <p className="text-sm mt-1 text-brown/80">
                    Présentez votre carte à votre prochaine visite.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRewardBanner(false)}
                  aria-label="Fermer"
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-brown/10 hover:bg-brown/20 flex items-center justify-center transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════ WALLET CARD ═══════════ */}
        <motion.article
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative aspect-[3/5] w-full rounded-[2rem] overflow-hidden shadow-2xl shadow-brown/40"
          style={{
            background:
              "linear-gradient(155deg, #3a2418 0%, #2C1810 42%, #1d0f07 100%)",
          }}
        >
          {/* Gold/cream noise texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
            aria-hidden="true"
          />
          {/* Gold glow top-left */}
          <div
            className="absolute -top-16 -left-12 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, #B8922F, transparent 70%)" }}
            aria-hidden="true"
          />
          {/* Warm glow bottom-right */}
          <div
            className="absolute -bottom-24 -right-10 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, #E8C97A, transparent 70%)" }}
            aria-hidden="true"
          />
          {/* Thin gold border */}
          <div
            className="absolute inset-0 rounded-[2rem] pointer-events-none"
            style={{ boxShadow: "inset 0 0 0 1px rgba(232, 201, 122, 0.18)" }}
            aria-hidden="true"
          />

          {/* ─── Card content ─── */}
          <div className="relative h-full flex flex-col text-cream p-6 sm:p-7">
            {/* Header */}
            <header className="flex items-start justify-between">
              <div>
                <p className="font-[family-name:var(--font-script)] text-gold-light text-lg leading-none">
                  Carte de fidélité
                </p>
                <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold leading-tight mt-1 tracking-tight">
                  L&apos;Arc en Ciel
                </h1>
              </div>
              <div
                className="w-9 h-9 rounded-full border border-gold-light/40 flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <span className="font-[family-name:var(--font-script)] text-gold-light text-xl leading-none">
                  A
                </span>
              </div>
            </header>

            {/* Stamps grid — centered */}
            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <StampsGrid
                total={stampsRequired}
                current={progress}
                pulse={celebrate}
              />
              <motion.p
                key={`${progress}-${stampsRequired}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="font-[family-name:var(--font-display)] text-gold-light text-3xl sm:text-4xl font-bold mt-6 tracking-tight"
              >
                {progress} <span className="text-cream/50">/</span> {stampsRequired}
                <span className="font-[family-name:var(--font-body)] text-cream/60 text-sm font-normal ml-2 uppercase tracking-widest">
                  tampons
                </span>
              </motion.p>
            </div>

            {/* Customer block */}
            <div className="mt-auto">
              <p className="text-cream/55 text-[10px] uppercase tracking-[0.2em] mb-1">
                Titulaire
              </p>
              <p className="font-[family-name:var(--font-display)] text-cream text-lg font-semibold leading-tight">
                {card.customer_name || "—"}
              </p>

              <button
                type="button"
                onClick={copyCardNumber}
                className="mt-2 inline-flex items-center gap-2 text-cream/70 hover:text-gold-light transition-colors text-xs font-mono group"
                aria-label="Copier le numéro de carte"
              >
                <span className="tracking-wider">{card.card_number}</span>
                <span aria-hidden="true">
                  {copied ? (
                    <svg
                      className="w-3.5 h-3.5 text-gold-light"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Celebration overlay */}
          <AnimatePresence>
            {celebrate && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
              >
                <Confetti />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.article>

        {/* ═══ QR block (below card) ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 bg-white-warm rounded-2xl p-6 shadow-lg border border-terracotta/20 text-center"
        >
          <div className="bg-white rounded-xl p-4 mx-auto inline-block shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt={`QR code carte ${card.card_number}`}
              width={240}
              height={240}
              className="block w-48 h-48 sm:w-56 sm:h-56"
            />
          </div>
          <p className="mt-4 text-brown font-semibold text-sm">
            Présentez ce QR à votre serveur
          </p>
          <p className="text-brown-light text-xs mt-1">
            Il l&apos;utilise pour ajouter un tampon
          </p>
        </motion.div>

        {/* ═══ Reward description ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 bg-gradient-to-br from-brown to-brown-light text-cream rounded-2xl p-6 shadow-lg"
        >
          <p className="font-[family-name:var(--font-script)] text-gold-light text-lg mb-1">
            Récompense
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold leading-tight">
            {config.reward_label}
          </h3>
          {config.reward_description && (
            <p className="text-cream/75 text-sm mt-2 leading-relaxed">
              {config.reward_description}
            </p>
          )}
        </motion.div>

        {/* ═══ PWA install hint ═══ */}
        <PwaInstallHint />

        {/* ═══ Transactions ═══ */}
        {transactions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-10"
          >
            <h2 className="font-[family-name:var(--font-display)] text-brown text-xl font-bold mb-4">
              Historique récent
            </h2>
            <ul className="space-y-2">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </ul>
          </motion.section>
        )}

        {/* Footer note */}
        <p className="text-center text-brown-light/60 text-xs mt-10 mb-4">
          {config.welcome_message ||
            "Merci de faire partie des habitués de L'Arc en Ciel."}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STAMPS GRID — 5 (or config) slots
   ═══════════════════════════════════════════════════════════ */
function StampsGrid({
  total,
  current,
  pulse,
}: {
  total: number;
  current: number;
  pulse: boolean;
}) {
  const cols = total <= 5 ? total : total <= 10 ? 5 : 6;
  return (
    <div
      className="grid gap-3 sm:gap-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < current;
        const justFilled = pulse && i === current - 1;
        return (
          <Stamp key={i} filled={filled} justFilled={justFilled} index={i} />
        );
      })}
    </div>
  );
}

function Stamp({
  filled,
  justFilled,
  index,
}: {
  filled: boolean;
  justFilled: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={false}
      animate={
        justFilled
          ? { scale: [1, 1.25, 1], rotate: [0, -6, 6, 0] }
          : { scale: 1 }
      }
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative aspect-square rounded-full flex items-center justify-center"
      style={{
        border: filled ? "2px solid #E8C97A" : "2px dashed rgba(232,201,122,0.35)",
        background: filled
          ? "radial-gradient(circle at 30% 30%, #E8C97A 0%, #B8922F 70%)"
          : "transparent",
        boxShadow: filled
          ? "0 4px 14px rgba(184, 146, 47, 0.35), inset 0 1px 2px rgba(255,255,255,0.3)"
          : "none",
      }}
      aria-label={filled ? `Tampon ${index + 1} obtenu` : `Tampon ${index + 1} à obtenir`}
    >
      {filled ? (
        <motion.span
          initial={justFilled ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="font-[family-name:var(--font-display)] text-brown font-bold text-lg sm:text-xl"
          aria-hidden="true"
        >
          ★
        </motion.span>
      ) : (
        <span
          className="font-[family-name:var(--font-display)] text-cream/30 text-xs sm:text-sm"
          aria-hidden="true"
        >
          {index + 1}
        </span>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRANSACTION ROW
   ═══════════════════════════════════════════════════════════ */
function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
  const date = new Date(tx.created_at);
  const formatted = isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  const meta = TX_META[tx.type] ?? TX_META.stamp_earned;

  return (
    <li className="flex items-center gap-4 bg-white-warm rounded-xl px-4 py-3 border border-terracotta/15">
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}
        aria-hidden="true"
      >
        <span className={`text-base ${meta.color}`}>{meta.icon}</span>
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-brown font-semibold text-sm leading-tight truncate">
          {meta.label}
        </p>
        {tx.note && (
          <p className="text-brown-light text-xs truncate">{tx.note}</p>
        )}
      </div>
      <span className="text-brown-light text-xs flex-shrink-0">
        {formatted}
      </span>
    </li>
  );
}

const TX_META: Record<
  string,
  { label: string; icon: string; bg: string; color: string }
> = {
  stamp_earned: {
    label: "Tampon ajouté",
    icon: "★",
    bg: "bg-gold/15",
    color: "text-gold",
  },
  reward_claimed: {
    label: "Récompense utilisée",
    icon: "✓",
    bg: "bg-red/15",
    color: "text-red",
  },
  stamp_adjusted: {
    label: "Ajustement",
    icon: "±",
    bg: "bg-brown/10",
    color: "text-brown",
  },
  enrollment: {
    label: "Inscription",
    icon: "✦",
    bg: "bg-terracotta-deep/20",
    color: "text-terracotta-deep",
  },
};

/* ═══════════════════════════════════════════════════════════
   PWA INSTALL HINT
   ═══════════════════════════════════════════════════════════ */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function PwaInstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosHintOpen, setIosHintOpen] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    queueMicrotask(() => {
      setIsIOS(ios);
      setInstalled(standalone);
    });

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      const res = await deferred.userChoice;
      if (res.outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else if (isIOS) {
      setIosHintOpen((o) => !o);
    } else {
      setIosHintOpen((o) => !o);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="mt-6"
    >
      <button
        type="button"
        onClick={handleInstall}
        className="w-full inline-flex items-center justify-center gap-3 bg-cream hover:bg-white-warm border border-terracotta/30 hover:border-gold text-brown font-semibold px-6 py-4 rounded-full transition-all duration-300"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
          />
        </svg>
        Ajouter à l&apos;écran d&apos;accueil
      </button>

      <AnimatePresence>
        {iosHintOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 bg-white-warm rounded-xl p-5 border border-terracotta/20 text-sm text-brown-light leading-relaxed">
              {isIOS ? (
                <>
                  <p className="font-semibold text-brown mb-2">Sur iPhone (Safari) :</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Touchez l&apos;icône de partage en bas de l&apos;écran</li>
                    <li>Choisissez « Sur l&apos;écran d&apos;accueil »</li>
                    <li>Validez avec « Ajouter »</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-semibold text-brown mb-2">Sur Android (Chrome) :</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Touchez le menu ⋮ en haut à droite</li>
                    <li>Choisissez « Ajouter à l&apos;écran d&apos;accueil »</li>
                    <li>Validez avec « Ajouter »</li>
                  </ol>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════ */
function CardSkeleton() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="h-4 w-32 bg-terracotta/20 rounded mb-6 animate-pulse" />
        <div className="aspect-[3/5] w-full rounded-[2rem] bg-brown/90 animate-pulse" />
        <div className="mt-6 h-64 rounded-2xl bg-white-warm animate-pulse" />
        <div className="mt-6 h-32 rounded-2xl bg-brown/20 animate-pulse" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONFETTI — CSS-only lightweight burst
   ═══════════════════════════════════════════════════════════ */
// Deterministic, pure confetti layout computed from index.
const CONFETTI_PIECES = Array.from({ length: 18 }).map((_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const variance = ((i * 37) % 60) + 80;
  const rot = ((i * 73) % 360) - 180;
  const delay = ((i * 13) % 15) / 100;
  const colors = ["#E8C97A", "#B8922F", "#C0392B", "#C4956A", "#FDF8F0"];
  return {
    id: i,
    x: Math.cos(angle) * variance,
    y: Math.sin(angle) * variance,
    rot,
    color: colors[i % colors.length],
    delay,
  };
});

function Confetti() {
  const pieces = CONFETTI_PIECES;

  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: 0,
            rotate: p.rot,
            scale: 1,
          }}
          transition={{ duration: 1.4, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
          className="absolute w-2 h-2 rounded-sm"
          style={{ background: p.color }}
        />
      ))}
    </div>
  );
}
