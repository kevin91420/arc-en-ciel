"use client";

/**
 * /admin/service/ce-soir — Timeline du service.
 *
 * Vue dédiée "manager en salle" : la soirée (ou le midi) déroulée comme un
 * rail vertical, heure par heure, avec chaque réservation placée à sa
 * fourchette. Compteurs en tête, ligne "ORA" (maintenant) animée, et
 * un drawer de détail à droite pour confirmer / installer à table / annuler.
 *
 * Fallback polling 30s en cas de Realtime indisponible.
 */

import Link from "next/link";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Reservation, ReservationStatus } from "@/lib/db/types";
import type { OrderWithItems } from "@/lib/db/pos-types";
import { formatCents, formatFrenchDate, todayISO } from "../../_lib/format";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import { OliveBranch } from "@/components/Decorations";

/* ─────────────── Constantes ─────────────── */

const POLL_MS = 30_000;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT_PX = 64; // hauteur par créneau 30 min
const PX_PER_MINUTE = SLOT_HEIGHT_PX / SLOT_MINUTES;

type ServiceKey = "midi" | "soir";

const SERVICES: Record<
  ServiceKey,
  { label: string; short: string; start: string; end: string }
> = {
  midi: { label: "Service du midi", short: "Midi", start: "11:30", end: "15:00" },
  soir: { label: "Service du soir", short: "Soir", start: "18:30", end: "23:00" },
};

/* Table assignable (1-10 par spec — on peut générer plus mais la sélection
   reste simple).  */
const TABLE_NUMBERS = Array.from({ length: 10 }, (_, i) => i + 1);

/* Pills de statut — tonalités cohérentes avec les tokens Tailwind du projet. */
const STATUS_VIZ: Record<
  ReservationStatus,
  { label: string; pill: string; dot: string }
> = {
  pending: {
    label: "En attente",
    pill: "bg-gold/15 text-gold-dark border-gold/40",
    dot: "bg-gold",
  },
  confirmed: {
    label: "Confirmée",
    pill: "bg-green-100 text-green-700 border-green-300",
    dot: "bg-green-500",
  },
  completed: {
    /* "Arrivés / installés à table" — état terminal positif */
    label: "Installés",
    pill: "bg-brown text-cream border-brown",
    dot: "bg-brown",
  },
  cancelled: {
    label: "Annulée",
    pill: "bg-red/10 text-red-dark/80 border-red/30 line-through",
    dot: "bg-red/70",
  },
  no_show: {
    label: "No-show",
    pill: "bg-red text-cream border-red",
    dot: "bg-red",
  },
};

/* Emoji badge pour l'occasion — mapping par mots-clés FR. */
function occasionEmoji(occ?: string | null): string | null {
  if (!occ) return null;
  const s = occ.toLowerCase();
  if (/anniv|birthday|bday/.test(s)) return "🎂";
  if (/mari|wedding|fian|proposal|demande/.test(s)) return "💍";
  if (/st[-\s]?valentin|valentine|amour|amoureux/.test(s)) return "💕";
  if (/pro|business|affaire|réunion|reunion|meeting/.test(s)) return "💼";
  if (/famille|family|enfant/.test(s)) return "👨‍👩‍👧";
  if (/diplôme|diplome|graduat/.test(s)) return "🎓";
  return "🎉";
}

/* ───────── Helpers temps ───────── */

/** "HH:MM" → minutes depuis minuit. */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** "HH:MM" → "19h30" (affichage FR). */
function formatHour(t: string): string {
  const [h, m] = t.split(":");
  return `${h}h${m}`;
}

/** Génère tous les créneaux entre start et end, tous les `step` minutes. */
function buildSlots(start: string, end: string, step = SLOT_MINUTES): string[] {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const out: string[] = [];
  for (let t = s; t <= e; t += step) {
    const h = String(Math.floor(t / 60)).padStart(2, "0");
    const m = String(t % 60).padStart(2, "0");
    out.push(`${h}:${m}`);
  }
  return out;
}

/** Service courant en fonction de l'heure locale. */
function currentServiceKey(date = new Date()): ServiceKey {
  const minutes = date.getHours() * 60 + date.getMinutes();
  /* Bascule à 16h00 : avant = midi, après = soir */
  return minutes < timeToMinutes("16:00") ? "midi" : "soir";
}

/** Retourne les minutes depuis minuit, heure locale. */
function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/* ═════════════════════════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════════════════════════ */

export default function CeSoirPage() {
  const [date, setDate] = useState<string>(todayISO());
  const [service, setService] = useState<ServiceKey>(() => currentServiceKey());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeOrders, setActiveOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const didScrollToNowRef = useRef(false);

  /* ── Fetch helpers ───────────────────────────────────────── */

  const loadReservations = useCallback(async () => {
    const params = new URLSearchParams({ date });
    const res = await fetch(`/api/reservations?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Reservation[];
  }, [date]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/service-stats`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return [] as OrderWithItems[];
      const data = (await res.json()) as { activeOrders?: OrderWithItems[] };
      return data.activeOrders || [];
    } catch {
      return [];
    }
  }, []);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [r, o] = await Promise.all([loadReservations(), loadOrders()]);
      setReservations(r);
      setActiveOrders(o);
    } catch (err) {
      setError((err as Error).message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [loadReservations, loadOrders]);

  useEffect(() => {
    setLoading(true);
    loadAll();
    const t = setInterval(loadAll, POLL_MS);
    return () => clearInterval(t);
  }, [loadAll]);

  /* Tick toutes les 30s pour rafraîchir la ligne "maintenant". */
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  /* Realtime — réservations ET commandes. */
  const tables = useMemo(() => ["reservations", "orders"], []);
  const { connected } = useRealtimeTable(tables, loadAll);

  /* ── Slice par service ─────────────────────────────────── */

  const svc = SERVICES[service];
  const slots = useMemo(() => buildSlots(svc.start, svc.end), [svc.start, svc.end]);
  const startMin = timeToMinutes(svc.start);
  const endMin = timeToMinutes(svc.end);

  /** Réservations filtrées dans la plage du service, triées par heure. */
  const serviceReservations = useMemo(() => {
    return reservations
      .filter((r) => {
        const m = timeToMinutes(r.time);
        return m >= startMin && m <= endMin;
      })
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [reservations, startMin, endMin]);

  /* ── Compteurs ─────────────────────────────────────────── */

  const counts = useMemo(() => {
    const active = serviceReservations.filter((r) => r.status !== "cancelled");
    const couverts = active.reduce((s, r) => s + r.guests, 0);
    const confirmed = active.filter((r) => r.status === "confirmed").length;
    const pending = active.filter((r) => r.status === "pending").length;
    const arrived = active.filter((r) => r.status === "completed").length;

    /* Pending urgent : à moins de 2h de l'heure prévue. */
    const now = nowMinutes();
    const pendingUrgent = active.filter(
      (r) =>
        r.status === "pending" &&
        timeToMinutes(r.time) - now > 0 &&
        timeToMinutes(r.time) - now < 120
    ).length;

    /* Affluence : couverts attendus dans les 30 prochaines minutes. */
    const incoming = active
      .filter((r) => {
        const m = timeToMinutes(r.time);
        return m >= now && m <= now + 30 && r.status !== "no_show";
      })
      .reduce((s, r) => s + r.guests, 0);

    return {
      total: active.length,
      couverts,
      confirmed,
      pending,
      pendingUrgent,
      arrived,
      incoming,
    };
  }, [serviceReservations, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Tables en cours de repas (du POS). */
  const openTables = useMemo(() => {
    const s = new Set<number>();
    for (const o of activeOrders) {
      if (typeof o.table_number === "number") s.add(o.table_number);
    }
    return s.size;
  }, [activeOrders]);

  /* ── Ligne "maintenant" ────────────────────────────────── */

  const now = nowMinutes();
  void tick; // relie la recalc à l'intervalle
  const nowInService = now >= startMin && now <= endMin;
  const nowOffsetPx = nowInService ? (now - startMin) * PX_PER_MINUTE : null;

  /* Scroll automatique sur "maintenant" au premier affichage. */
  useLayoutEffect(() => {
    if (didScrollToNowRef.current) return;
    if (loading) return;
    if (!timelineScrollRef.current) return;
    if (nowOffsetPx == null) return;
    const target = Math.max(0, nowOffsetPx - 120);
    timelineScrollRef.current.scrollTo({ top: target, behavior: "smooth" });
    didScrollToNowRef.current = true;
  }, [loading, nowOffsetPx]);

  /* Reset le flag quand on change de service → re-scroll */
  useEffect(() => {
    didScrollToNowRef.current = false;
  }, [service, date]);

  /* ── Actions ───────────────────────────────────────────── */

  async function patchReservation(
    id: string,
    patch: Partial<Reservation>
  ): Promise<Reservation | null> {
    setSavingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const updated: Reservation = await res.json();
      setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
      if (selected?.id === id) setSelected(updated);
      return updated;
    } catch (err) {
      alert(`Erreur : ${(err as Error).message}`);
      return null;
    } finally {
      setSavingId(null);
    }
  }

  /* ── Stats bas de page (approximations raisonnables) ──── */

  const footerStats = useMemo(() => {
    const expectedCovers = counts.couverts;
    /* Ticket moyen de démo (pas de stats 7 jours côté client). */
    const avgTicketCents = 3250; // 32,50 €
    const estimatedCA = expectedCovers * avgTicketCents;
    return { expectedCovers, avgTicketCents, estimatedCA };
  }, [counts.couverts]);

  /* ═════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════ */

  if (loading && reservations.length === 0) return <PageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto">
      {/* ═════════ Header ═════════ */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5"
      >
        <div>
          <p className="font-[family-name:var(--font-script)] text-gold text-2xl leading-none">
            Ce soir
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-brown mt-1">
            Timeline du service
          </h1>
          <p className="mt-1 text-sm text-brown-light capitalize">
            {formatFrenchDate(date)} · {svc.label}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* Indicateur realtime */}
          <div
            className={[
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.18em] font-bold h-fit",
              connected
                ? "bg-green-100 text-green-700"
                : "bg-cream/50 text-brown/60",
            ].join(" ")}
            title={connected ? "Realtime connecté" : "Polling 30s"}
          >
            <span
              className={[
                "w-1.5 h-1.5 rounded-full",
                connected ? "bg-green-500 animate-pulse" : "bg-brown/40",
              ].join(" ")}
            />
            {connected ? "Live" : "Polling"}
          </div>

          {/* Date */}
          <div>
            <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 bg-white-warm border border-terracotta/40 rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          {/* Sélecteur de service (tabs) */}
          <div>
            <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
              Service
            </label>
            <div className="inline-flex rounded-lg border border-terracotta/40 bg-white-warm p-1">
              {(Object.keys(SERVICES) as ServiceKey[]).map((k) => {
                const active = service === k;
                return (
                  <button
                    key={k}
                    onClick={() => setService(k)}
                    className={[
                      "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition",
                      active
                        ? "bg-brown text-cream shadow-sm"
                        : "text-brown-light hover:text-brown",
                    ].join(" ")}
                  >
                    {SERVICES[k].short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.header>

      {/* ═════════ Counter bar ═════════ */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8"
      >
        <Counter
          label="Total"
          value={counts.total}
          sub={`${counts.couverts} couverts`}
          accent
        />
        <Counter label="Confirmées" value={counts.confirmed} tone="green" />
        <Counter
          label="En attente"
          value={counts.pending}
          tone="gold"
          urgent={counts.pendingUrgent > 2}
          urgentSub={counts.pendingUrgent > 2 ? `${counts.pendingUrgent} urgentes` : undefined}
        />
        <Counter label="Arrivées" value={counts.arrived} tone="brown" />
        <Counter
          label="À table (POS)"
          value={openTables}
          sub={openTables > 0 ? "en cours" : "—"}
        />
        <Counter
          label="Affluence 30 min"
          value={counts.incoming}
          sub="couverts"
          tone={
            counts.incoming >= 20
              ? "red"
              : counts.incoming >= 10
                ? "gold"
                : "green"
          }
        />
      </motion.section>

      {/* ═════════ Error ═════════ */}
      {error && (
        <div className="mb-6 bg-red/5 border border-red/20 text-red-dark rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Impossible de rafraîchir</p>
            <p className="text-xs text-red-dark/80 mt-0.5">{error}</p>
          </div>
          <button
            onClick={loadAll}
            className="px-3 py-1.5 bg-red text-cream text-xs font-bold uppercase tracking-wider rounded-md hover:bg-red-dark"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ═════════ Main split — timeline + empty state ═════════ */}
      {serviceReservations.length === 0 ? (
        <EmptyState />
      ) : (
        <Timeline
          ref={timelineScrollRef}
          slots={slots}
          reservations={serviceReservations}
          startMin={startMin}
          nowOffsetPx={nowOffsetPx}
          nowLabel={formatHour(
            `${String(Math.floor(now / 60)).padStart(2, "0")}:${String(
              now % 60
            ).padStart(2, "0")}`
          )}
          onSelect={setSelected}
          selectedId={selected?.id || null}
          savingId={savingId}
          onPatch={patchReservation}
        />
      )}

      {/* ═════════ Footer summary ═════════ */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        <FooterStat
          label="Prévisions couverts"
          value={`${footerStats.expectedCovers}`}
          hint="attendus ce service"
        />
        <FooterStat
          label="Ticket moyen (réf.)"
          value={formatCents(footerStats.avgTicketCents)}
          hint="estimation par couvert"
        />
        <FooterStat
          label="CA estimé"
          value={`~${formatCents(footerStats.estimatedCA)}`}
          hint="couverts × ticket moyen"
          accent
        />
      </motion.section>

      {/* ═════════ Detail drawer ═════════ */}
      <AnimatePresence>
        {selected && (
          <DetailDrawer
            key={selected.id}
            reservation={selected}
            saving={savingId === selected.id}
            onClose={() => setSelected(null)}
            onPatch={patchReservation}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TIMELINE — rail vertical (heures à gauche, cartes à droite)
   ═══════════════════════════════════════════════════════════════ */

type TimelineProps = {
  slots: string[];
  reservations: Reservation[];
  startMin: number;
  nowOffsetPx: number | null;
  nowLabel: string;
  onSelect: (r: Reservation) => void;
  selectedId: string | null;
  savingId: string | null;
  onPatch: (
    id: string,
    patch: Partial<Reservation>
  ) => Promise<Reservation | null>;
};

const Timeline = forwardRef<HTMLDivElement, TimelineProps>(function Timeline(
  {
    slots,
    reservations,
    startMin,
    nowOffsetPx,
    nowLabel,
    onSelect,
    selectedId,
    savingId,
    onPatch,
  },
  ref
) {
  const totalHeight = (slots.length - 1) * SLOT_HEIGHT_PX + 24;

    /* Regroupement des résas par créneau pour éviter les chevauchements
       visuels : on garde l'heure exacte mais on empile dans la colonne. */
    const grouped = useMemo(() => {
      const map = new Map<number, Reservation[]>();
      for (const r of reservations) {
        const m = timeToMinutes(r.time);
        if (!map.has(m)) map.set(m, []);
        map.get(m)!.push(r);
      }
      return map;
    }, [reservations]);

    return (
      <div
        ref={ref}
        className="relative bg-white-warm/60 rounded-2xl border border-terracotta/20 shadow-sm overflow-y-auto max-h-[70vh]"
      >
        <div
          className="relative flex"
          style={{ minHeight: `${totalHeight}px` }}
        >
          {/* Colonne heures */}
          <div className="w-20 flex-shrink-0 relative border-r border-terracotta/20 bg-cream/40">
            {slots.map((s, i) => (
              <div
                key={s}
                className="absolute left-0 right-0 flex items-start justify-center"
                style={{ top: `${i * SLOT_HEIGHT_PX}px`, height: `${SLOT_HEIGHT_PX}px` }}
              >
                <span
                  className={[
                    "font-[family-name:var(--font-display)] text-sm tabular-nums",
                    s.endsWith(":00")
                      ? "text-brown font-bold"
                      : "text-brown-light/60 font-medium",
                  ].join(" ")}
                  style={{ marginTop: "-8px", background: "rgba(253,248,240,0.9)", padding: "0 4px" }}
                >
                  {formatHour(s)}
                </span>
              </div>
            ))}
          </div>

          {/* Colonne cartes */}
          <div className="relative flex-1 min-w-0">
            {/* Grille horizontale tous les 30 min */}
            {slots.map((s, i) => (
              <div
                key={s}
                className={[
                  "absolute left-0 right-0 border-t",
                  s.endsWith(":00")
                    ? "border-terracotta/25"
                    : "border-terracotta/10 border-dashed",
                ].join(" ")}
                style={{ top: `${i * SLOT_HEIGHT_PX}px` }}
              />
            ))}

            {/* Ligne centrale continue + points */}
            <div
              className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-gold/0 via-gold/50 to-gold/0"
              style={{ left: "24px" }}
            />

            {/* Cartes réservations */}
            <AnimatePresence initial={false}>
              {reservations.map((r) => {
                const m = timeToMinutes(r.time);
                const top = (m - startMin) * PX_PER_MINUTE;
                /* Si plusieurs résas à la même minute → léger offset horizontal. */
                const siblings = grouped.get(m) || [];
                const idx = siblings.findIndex((x) => x.id === r.id);
                return (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    top={top}
                    offsetX={idx * 8}
                    selected={selectedId === r.id}
                    saving={savingId === r.id}
                    onSelect={() => onSelect(r)}
                    onPatch={onPatch}
                  />
                );
              })}
            </AnimatePresence>

            {/* Ribbon "ORA" / maintenant */}
            {nowOffsetPx != null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute left-0 right-0 pointer-events-none z-10"
                style={{ top: `${nowOffsetPx}px` }}
              >
                <div className="relative h-px bg-gold">
                  <motion.span
                    className="absolute left-0 -translate-y-1/2 w-3 h-3 rounded-full bg-gold border-2 border-white-warm"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <span className="absolute left-4 -translate-y-1/2 bg-gold text-cream px-2 py-0.5 rounded-md text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-1.5 shadow">
                    <em className="font-[family-name:var(--font-script)] text-sm not-italic">
                      Ora
                    </em>
                    <span className="opacity-80">· {nowLabel}</span>
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    );
});

/* ═══════════════════════════════════════════════════════════════
   RESERVATION CARD
   ═══════════════════════════════════════════════════════════════ */

function ReservationCard({
  reservation,
  top,
  offsetX,
  selected,
  saving,
  onSelect,
  onPatch,
}: {
  reservation: Reservation;
  top: number;
  offsetX: number;
  selected: boolean;
  saving: boolean;
  onSelect: () => void;
  onPatch: (
    id: string,
    patch: Partial<Reservation>
  ) => Promise<Reservation | null>;
}) {
  const viz = STATUS_VIZ[reservation.status];
  const emoji = occasionEmoji(reservation.special_occasion);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);

  const quickAction = async (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={[
        "absolute",
        reservation.status === "cancelled" ? "opacity-60" : "",
      ].join(" ")}
      style={{
        top: `${top}px`,
        left: `${48 + offsetX}px`,
        right: "12px",
      }}
    >
      {/* Dot on the vertical line */}
      <span
        className={[
          "absolute -left-[26px] top-3 w-2.5 h-2.5 rounded-full border-2 border-white-warm",
          viz.dot,
        ].join(" ")}
      />

      <button
        type="button"
        onClick={onSelect}
        className={[
          "w-full text-left group rounded-xl p-3 bg-white-warm border transition shadow-sm",
          selected
            ? "border-gold ring-2 ring-gold/40 shadow-md"
            : "border-terracotta/25 hover:border-gold/50 hover:shadow-md",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          {/* Heure */}
          <div className="flex-shrink-0 text-center min-w-[52px]">
            <div className="font-[family-name:var(--font-display)] text-lg font-bold text-brown leading-none tabular-nums">
              {formatHour(reservation.time)}
            </div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-brown-light/60 mt-1">
              {reservation.guests} pers.
            </div>
          </div>

          {/* Corps */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-brown truncate max-w-[14rem]">
                {reservation.customer_name}
              </span>
              {emoji && (
                <span
                  aria-label={reservation.special_occasion || "occasion"}
                  title={reservation.special_occasion || "Occasion"}
                  className="text-sm leading-none"
                >
                  {emoji}
                </span>
              )}
              <span
                className={[
                  "text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-md border",
                  viz.pill,
                ].join(" ")}
              >
                {viz.label}
              </span>
              {typeof reservation.table_number === "number" && (
                <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-md bg-brown/10 text-brown border border-brown/20">
                  T{reservation.table_number}
                </span>
              )}
            </div>

            {reservation.notes && (
              <p className="text-xs text-brown-light/80 mt-1 line-clamp-1 italic">
                “{reservation.notes}”
              </p>
            )}

            {/* Actions contextuelles */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {reservation.status === "pending" && (
                <ActionPill
                  onClick={(e) =>
                    quickAction(e, () =>
                      onPatch(reservation.id, { status: "confirmed" })
                    )
                  }
                  tone="green"
                  disabled={saving}
                >
                  Confirmer
                </ActionPill>
              )}
              {reservation.status === "confirmed" && (
                <>
                  <ActionPill
                    onClick={(e) =>
                      quickAction(e, () =>
                        onPatch(reservation.id, { status: "completed" })
                      )
                    }
                    tone="brown"
                    disabled={saving}
                  >
                    Arrivés
                  </ActionPill>
                  <div className="relative">
                    <ActionPill
                      onClick={(e) =>
                        quickAction(e, () => setTableMenuOpen((v) => !v))
                      }
                      tone="gold"
                      disabled={saving}
                    >
                      {typeof reservation.table_number === "number"
                        ? `Table ${reservation.table_number} ▾`
                        : "Installer à… ▾"}
                    </ActionPill>
                    {tableMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute z-20 top-full mt-1 left-0 bg-white-warm border border-terracotta/40 rounded-lg shadow-lg p-1 grid grid-cols-5 gap-1 w-[180px]"
                      >
                        {TABLE_NUMBERS.map((t) => (
                          <button
                            key={t}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setTableMenuOpen(false);
                              await onPatch(reservation.id, {
                                table_number: t,
                                status: "completed",
                              });
                            }}
                            className={[
                              "px-1.5 py-1 text-xs font-bold tabular-nums rounded-md transition",
                              reservation.table_number === t
                                ? "bg-brown text-cream"
                                : "bg-cream/50 text-brown hover:bg-gold/30",
                            ].join(" ")}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              {(reservation.status === "pending" ||
                reservation.status === "confirmed") && (
                <ActionPill
                  onClick={(e) =>
                    quickAction(e, () =>
                      onPatch(reservation.id, { status: "no_show" })
                    )
                  }
                  tone="red-ghost"
                  disabled={saving}
                >
                  No-show
                </ActionPill>
              )}
            </div>
          </div>
        </div>
      </button>
    </motion.article>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DETAIL DRAWER
   ═══════════════════════════════════════════════════════════════ */

function DetailDrawer({
  reservation,
  saving,
  onClose,
  onPatch,
}: {
  reservation: Reservation;
  saving: boolean;
  onClose: () => void;
  onPatch: (
    id: string,
    patch: Partial<Reservation>
  ) => Promise<Reservation | null>;
}) {
  /* The drawer is keyed by reservation.id by the parent → natural remount
     on selection change re-initialises these correctly. */
  const [notes, setNotes] = useState(reservation.notes || "");
  const [tableNumber, setTableNumber] = useState<number | "">(
    reservation.table_number ?? ""
  );
  const viz = STATUS_VIZ[reservation.status];
  const emoji = occasionEmoji(reservation.special_occasion);

  async function saveDrawer() {
    const patch: Partial<Reservation> = {};
    if ((notes || "").trim() !== (reservation.notes || "").trim()) {
      patch.notes = notes.trim() || null;
    }
    if (
      (tableNumber === "" ? null : Number(tableNumber)) !==
      (reservation.table_number ?? null)
    ) {
      patch.table_number = tableNumber === "" ? null : Number(tableNumber);
    }
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    const res = await onPatch(reservation.id, patch);
    if (res) onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-brown/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] bg-white-warm shadow-2xl flex flex-col"
      >
        <header className="flex items-start justify-between p-5 border-b border-terracotta/20">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold">
              Réservation
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brown mt-1 flex items-center gap-2">
              {reservation.customer_name}
              {emoji && <span className="text-xl">{emoji}</span>}
            </h2>
            <p className="text-sm text-brown-light mt-0.5 capitalize">
              {formatFrenchDate(reservation.date)} · {formatHour(reservation.time)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 rounded-lg text-brown/60 hover:text-brown hover:bg-cream/50 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Statut + couverts */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={[
                "text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border",
                viz.pill,
              ].join(" ")}
            >
              {viz.label}
            </span>
            <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md bg-cream/70 text-brown border border-brown/15">
              {reservation.guests} couvert{reservation.guests > 1 ? "s" : ""}
            </span>
            {reservation.source && (
              <span className="text-[10px] uppercase tracking-widest text-brown-light/60">
                · {reservation.source}
              </span>
            )}
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 gap-2">
            <InfoRow
              label="Téléphone"
              value={
                <a
                  href={`tel:${reservation.customer_phone}`}
                  className="text-brown hover:text-gold transition tabular-nums"
                >
                  {reservation.customer_phone}
                </a>
              }
            />
            {reservation.customer_email && (
              <InfoRow
                label="Email"
                value={
                  <a
                    href={`mailto:${reservation.customer_email}`}
                    className="text-brown hover:text-gold transition truncate block"
                  >
                    {reservation.customer_email}
                  </a>
                }
              />
            )}
            {reservation.special_occasion && (
              <InfoRow
                label="Occasion"
                value={
                  <span className="text-brown">
                    {emoji} {reservation.special_occasion}
                  </span>
                }
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Allergies, préférences, demandes spéciales…"
              className="w-full px-3 py-2 bg-cream/40 border border-terracotta/30 rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-gold resize-none"
            />
          </div>

          {/* Assigner table */}
          <div>
            <label className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-1">
              Table assignée
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setTableNumber("")}
                className={[
                  "px-2 py-1 text-xs font-bold rounded-md transition border",
                  tableNumber === ""
                    ? "bg-brown text-cream border-brown"
                    : "bg-white-warm text-brown-light border-terracotta/30 hover:border-gold",
                ].join(" ")}
              >
                Aucune
              </button>
              {TABLE_NUMBERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTableNumber(t)}
                  className={[
                    "px-2.5 py-1 text-xs font-bold tabular-nums rounded-md transition border",
                    tableNumber === t
                      ? "bg-gold text-brown border-gold shadow"
                      : "bg-white-warm text-brown-light border-terracotta/30 hover:border-gold",
                  ].join(" ")}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Actions de statut */}
          <div>
            <p className="block text-[10px] tracking-wider uppercase text-brown-light font-semibold mb-2">
              Statut
            </p>
            <div className="grid grid-cols-2 gap-2">
              <StatusButton
                active={reservation.status === "confirmed"}
                onClick={() =>
                  onPatch(reservation.id, { status: "confirmed" })
                }
                disabled={saving}
                tone="green"
              >
                Confirmer
              </StatusButton>
              <StatusButton
                active={reservation.status === "completed"}
                onClick={() =>
                  onPatch(reservation.id, { status: "completed" })
                }
                disabled={saving}
                tone="brown"
              >
                Marquer arrivés
              </StatusButton>
              <StatusButton
                active={reservation.status === "no_show"}
                onClick={() => onPatch(reservation.id, { status: "no_show" })}
                disabled={saving}
                tone="red"
              >
                No-show
              </StatusButton>
              <StatusButton
                active={reservation.status === "cancelled"}
                onClick={() =>
                  onPatch(reservation.id, { status: "cancelled" })
                }
                disabled={saving}
                tone="red-ghost"
              >
                Annuler
              </StatusButton>
            </div>
          </div>
        </div>

        <footer className="p-5 border-t border-terracotta/20 flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-cream/50 text-brown text-sm font-semibold hover:bg-cream transition"
          >
            Fermer
          </button>
          <button
            onClick={saveDrawer}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-brown text-cream text-sm font-bold uppercase tracking-wider hover:bg-brown-light transition disabled:opacity-60"
          >
            {saving ? "…" : "Enregistrer"}
          </button>
        </footer>
      </motion.aside>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Petits composants
   ═══════════════════════════════════════════════════════════════ */

function Counter({
  label,
  value,
  sub,
  accent = false,
  tone,
  urgent,
  urgentSub,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
  tone?: "gold" | "green" | "brown" | "red";
  urgent?: boolean;
  urgentSub?: string;
}) {
  const toneClass =
    tone === "gold"
      ? "from-gold/20 to-transparent border-gold/40"
      : tone === "green"
        ? "from-green-100 to-transparent border-green-300"
        : tone === "brown"
          ? "from-brown/10 to-transparent border-brown/30"
          : tone === "red"
            ? "from-red/15 to-transparent border-red/40"
            : accent
              ? "from-gold/15 to-transparent border-gold/40"
              : "from-white-warm to-transparent border-terracotta/15";

  return (
    <div
      className={[
        "relative p-4 rounded-2xl border bg-gradient-to-br",
        toneClass,
        urgent ? "ring-2 ring-red/50" : "",
      ].join(" ")}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-brown-light/70 font-bold">
        {label}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <div
          className={[
            "font-[family-name:var(--font-display)] font-bold text-brown leading-none tabular-nums",
            accent ? "text-3xl" : "text-2xl",
          ].join(" ")}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[11px] text-brown-light/70">{sub}</div>
        )}
      </div>
      {urgent && urgentSub && (
        <div className="absolute -top-2 -right-2 text-[9px] uppercase tracking-widest bg-red text-cream px-1.5 py-0.5 rounded-md font-bold shadow">
          {urgentSub}
        </div>
      )}
    </div>
  );
}

function ActionPill({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  tone: "green" | "gold" | "brown" | "red-ghost";
}) {
  const toneClass =
    tone === "green"
      ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-300"
      : tone === "gold"
        ? "bg-gold/20 text-gold-dark hover:bg-gold/30 border-gold/40"
        : tone === "brown"
          ? "bg-brown text-cream hover:bg-brown-light border-brown"
          : "bg-transparent text-red-dark/80 hover:bg-red/10 border-red/25";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border transition disabled:opacity-50",
        toneClass,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatusButton({
  children,
  onClick,
  disabled,
  active,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tone: "green" | "brown" | "red" | "red-ghost";
}) {
  const base =
    "px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition disabled:opacity-50";
  const palette =
    tone === "green"
      ? active
        ? "bg-green-600 text-cream border-green-600"
        : "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
      : tone === "brown"
        ? active
          ? "bg-brown text-cream border-brown"
          : "bg-brown/10 text-brown border-brown/25 hover:bg-brown/20"
        : tone === "red"
          ? active
            ? "bg-red text-cream border-red"
            : "bg-red/10 text-red-dark border-red/30 hover:bg-red/20"
          : active
            ? "bg-red/80 text-cream border-red/80"
            : "bg-transparent text-red-dark/80 border-red/25 hover:bg-red/10";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[base, palette].join(" ")}
    >
      {children}
    </button>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 border-b border-terracotta/10 last:border-0">
      <span className="text-[10px] uppercase tracking-wider text-brown-light/70 font-semibold flex-shrink-0">
        {label}
      </span>
      <span className="text-sm min-w-0 text-right">{value}</span>
    </div>
  );
}

function FooterStat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "p-4 rounded-2xl border",
        accent
          ? "bg-gradient-to-br from-gold/15 to-transparent border-gold/40"
          : "bg-white-warm border-terracotta/20",
      ].join(" ")}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-brown-light/70 font-bold">
        {label}
      </div>
      <div
        className={[
          "font-[family-name:var(--font-display)] font-bold text-brown leading-tight mt-1 tabular-nums",
          accent ? "text-3xl" : "text-2xl",
        ].join(" ")}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-brown-light/70 mt-0.5">{hint}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Empty state + skeleton
   ═══════════════════════════════════════════════════════════════ */

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white-warm/70 border border-terracotta/20 rounded-2xl p-12 flex flex-col items-center text-center"
    >
      <OliveBranch className="w-32 h-10 text-gold mb-5" />
      <p className="font-[family-name:var(--font-display)] text-2xl text-brown font-bold">
        Aucune réservation pour ce service
      </p>
      <p className="text-sm text-brown-light/80 mt-2 max-w-sm">
        La soirée est encore ouverte. Les nouvelles réservations apparaîtront
        ici en temps réel.
      </p>
      <Link
        href="/admin/reservations"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brown text-cream text-sm font-bold uppercase tracking-wider hover:bg-brown-light transition"
      >
        Voir toutes les réservations
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </motion.div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto animate-pulse">
      <div className="h-10 w-64 bg-cream rounded mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-white-warm rounded-2xl" />
        ))}
      </div>
      <div className="h-[500px] bg-white-warm rounded-2xl" />
    </div>
  );
}
