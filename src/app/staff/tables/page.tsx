"use client";

/**
 * /staff/tables — Plan de salle.
 *
 * - Tables are driven by `restaurant_settings.tables` (white-label: any count,
 *   any label, any zone). Falls back to 10 generic tables if the feed fails.
 * - Three top-level tabs: Salle (default) · À emporter · Livraison.
 *   Each tab surfaces only the relevant orders. Badge counters update live.
 * - Zone sub-filter on the Salle tab when at least two zones exist, so a
 *   manager can isolate "Terrasse" or "Étage" during rush hour.
 * - Realtime is piped from `orders` and `order_items` — any chef or other
 *   server refreshes every tablet at once.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import { formatCents, formatDuration, minutesSince } from "@/lib/format";
import type { OrderWithItems } from "@/lib/db/pos-types";
import type { TableConfig } from "@/lib/db/settings-types";
import TablePlanCanvas from "@/components/TablePlanCanvas";

const NOTIF_KEY = "arc-staff-notif";
const VIEW_KEY = "arc-staff-tables-view";

type TabId = "salle" | "emporter" | "livraison";

const FALLBACK_TABLES: TableConfig[] = Array.from({ length: 10 }, (_, i) => ({
  number: i + 1,
  label: `T${i + 1}`,
  capacity: 4,
  zone: "Salle",
}));

type TileState =
  | "libre"
  | "occupee" /* open, nothing fired yet */
  | "cuisine" /* fired, items cooking */
  | "prete" /* at least one item ready */
  | "servie" /* all items served, mealtime in progress (blue) */
  | "encaisser"; /* all items served + addition demandée → caissier flag */

/* Derive tile state from item statuses, not just order.status — this is more
 * accurate (a 'fired' order whose items are all ready should show ready, not
 * cuisine). Cancelled items are ignored. */
function deriveTileState(order: OrderWithItems | undefined): TileState {
  if (!order) return "libre";
  const active = order.items.filter((i) => i.status !== "cancelled");
  if (active.length === 0) return "occupee";

  /* Servir prime sur tout — chaque seconde compte côté chrono. */
  if (active.some((i) => i.status === "ready" && !i.acknowledged_at))
    return "prete";
  /* Tous les items finis (servi en salle ou pris en compte) → bleu. */
  if (
    active.every(
      (i) =>
        i.status === "served" ||
        (i.status === "ready" && i.acknowledged_at)
    )
  )
    return "servie";
  /* Mix : au moins un encore en cuisine. */
  if (active.some((i) => i.status === "cooking" || i.status === "pending"))
    return "cuisine";
  return "occupee";
}

const TILE_STYLES: Record<
  TileState,
  {
    bg: string;
    border: string;
    ink: string;
    accent: string;
    label: string;
    pulse?: boolean;
  }
> = {
  libre: {
    bg: "bg-white-warm",
    border: "border-terracotta/40",
    ink: "text-brown",
    accent: "text-brown-light/70",
    label: "Libre",
  },
  occupee: {
    bg: "bg-gold/10",
    border: "border-gold/50",
    ink: "text-brown",
    accent: "text-gold",
    label: "Commande en cours",
  },
  cuisine: {
    bg: "bg-[#F2A65A]/15",
    border: "border-[#E67E22]/60",
    ink: "text-brown",
    accent: "text-[#E67E22]",
    label: "En cuisine",
  },
  prete: {
    bg: "bg-green-100",
    border: "border-green-500",
    ink: "text-brown",
    accent: "text-green-700",
    label: "🍽 À SERVIR MAINTENANT",
    pulse: true,
  },
  servie: {
    bg: "bg-sky-100",
    border: "border-sky-400",
    ink: "text-brown",
    accent: "text-sky-700",
    label: "🍴 Repas en cours",
  },
  encaisser: {
    bg: "bg-brown/10",
    border: "border-brown-light/50",
    ink: "text-brown",
    accent: "text-brown-light",
    label: "💳 À encaisser",
  },
};

export default function TablesPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [tables, setTables] = useState<TableConfig[]>(FALLBACK_TABLES);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("salle");
  const [zoneFilter, setZoneFilter] = useState<string | "all">("all");
  const [creatingTakeaway, setCreatingTakeaway] = useState<
    null | "takeaway" | "delivery"
  >(null);
  const [notifOn, setNotifOn] = useState(true);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "plan">("grid");
  const knownReadyItems = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  /* Restore view preference from localStorage. */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      if (saved === "plan") setView("plan");
    } catch {}
  }, []);

  function toggleView() {
    setView((prev) => {
      const next = prev === "grid" ? "plan" : "grid";
      try {
        window.localStorage.setItem(VIEW_KEY, next);
      } catch {}
      return next;
    });
  }

  /* Restore notification preference from localStorage. Default ON. */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NOTIF_KEY);
      if (saved === "off") setNotifOn(false);
    } catch {}
  }, []);

  /* Pull staff identity once so the ping only fires for THIS server's tables.
   * Tables with no assigned staff (counter, takeaway) ping everyone. */
  useEffect(() => {
    fetch("/api/staff/auth", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.id) setStaffId(d.id);
      })
      .catch(() => {});
  }, []);

  const playReadyChime = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      /* Pleasant 2-note motif (E5 then A5) — distinct from the KDS ping. */
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
      osc.onended = () => ctx.close();
    } catch {
      /* Audio is best effort. */
    }
    try {
      navigator.vibrate?.([60, 40, 60]);
    } catch {}
  }, []);

  function toggleNotif() {
    setNotifOn((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(NOTIF_KEY, next ? "on" : "off");
      } catch {}
      return next;
    });
  }

  /* Load the floor plan from public settings. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) throw new Error("settings fetch failed");
        const data = (await res.json()) as { tables?: TableConfig[] };
        if (!cancelled && Array.isArray(data.tables) && data.tables.length > 0) {
          setTables(data.tables);
        }
      } catch {
        /* keep fallback */
      } finally {
        if (!cancelled) setTablesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/orders", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) router.push("/staff/login");
        return;
      }
      const data = await res.json();
      const next: OrderWithItems[] = Array.isArray(data?.orders) ? data.orders : [];
      setOrders(next);

      /* Detect newly-ready items for this staff member → ping + vibrate.
       * Items shown elsewhere (other servers' tables) are ignored. We diff
       * against the previous known set so a single PATCH triggers exactly
       * one ping, not one per realtime tick. */
      const incomingReady = new Set<string>();
      for (const o of next) {
        const mine =
          !o.staff_id ||
          (staffId && o.staff_id === staffId);
        if (!mine) continue;
        for (const it of o.items) {
          if (it.status === "ready" && !it.acknowledged_at) {
            incomingReady.add(it.id);
          }
        }
      }
      if (!firstLoadRef.current && notifOn) {
        for (const id of incomingReady) {
          if (!knownReadyItems.current.has(id)) {
            playReadyChime();
            break; /* one chime per refresh — don't machine-gun the floor */
          }
        }
      }
      knownReadyItems.current = incomingReady;
      firstLoadRef.current = false;
    } catch {
      /* Silently retry on next realtime tick. */
    } finally {
      setLoading(false);
    }
  }, [router, staffId, notifOn, playReadyChime]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useRealtimeTable(["orders", "order_items"], refresh);

  /* Group active orders by table number (latest wins). */
  const orderByTable = useMemo(() => {
    const m = new Map<number, OrderWithItems>();
    for (const o of orders) {
      if (o.table_number == null) continue;
      if (!m.has(o.table_number)) m.set(o.table_number, o);
    }
    return m;
  }, [orders]);

  const takeawayOrders = useMemo(
    () =>
      orders.filter(
        (o) => o.table_number == null && o.source === "takeaway"
      ),
    [orders]
  );
  const deliveryOrders = useMemo(
    () =>
      orders.filter(
        (o) => o.table_number == null && o.source === "delivery"
      ),
    [orders]
  );

  /* Unique list of zones for the sub-filter (only rendered if ≥2). */
  const zones = useMemo(() => {
    const s = new Set<string>();
    for (const t of tables) {
      const z = t.zone?.trim();
      if (z) s.add(z);
    }
    return [...s].sort();
  }, [tables]);

  /* Filtered tables for the Salle tab. */
  const visibleTables = useMemo(() => {
    if (zoneFilter === "all") return tables;
    return tables.filter((t) => (t.zone?.trim() || "") === zoneFilter);
  }, [tables, zoneFilter]);

  /* Counts per tab — shown as badge chips. */
  const busyCount = useMemo(
    () => [...orderByTable.values()].filter(Boolean).length,
    [orderByTable]
  );

  async function createOffsite(kind: "takeaway" | "delivery") {
    if (creatingTakeaway) return;
    setCreatingTakeaway(kind);
    try {
      const res = await fetch("/api/staff/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ source: kind, guest_count: 1 }),
      });
      if (!res.ok) return;
      const order = (await res.json()) as { id: string };
      router.push(`/staff/order/${order.id}`);
    } finally {
      setCreatingTakeaway(null);
    }
  }

  return (
    <div className="px-4 md:px-8 py-6">
      {/* ─── Header ─────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown font-semibold leading-tight">
            Plan de salle
          </h1>
          <p className="mt-1 text-sm text-brown-light">
            {loading || tablesLoading ? (
              "Chargement du service…"
            ) : busyCount === 0 && takeawayOrders.length === 0 && deliveryOrders.length === 0 ? (
              <>Toutes les tables sont libres. Bon service&nbsp;!</>
            ) : (
              <>
                {busyCount} / {tables.length} tables occupées
                {takeawayOrders.length > 0 && (
                  <> · {takeawayOrders.length} à emporter</>
                )}
                {deliveryOrders.length > 0 && (
                  <> · {deliveryOrders.length} en livraison</>
                )}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleView}
            title={
              view === "grid"
                ? "Passer en vue plan 2D"
                : "Passer en vue grille"
            }
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold transition active:scale-95 border bg-cream border-terracotta/30 text-brown-light hover:text-brown"
          >
            <span aria-hidden>{view === "grid" ? "🗺" : "▦"}</span>
            <span className="hidden sm:inline">
              {view === "grid" ? "Vue plan" : "Vue grille"}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleNotif}
            title={
              notifOn
                ? "Notification sonore activée — cliquer pour désactiver"
                : "Notification sonore désactivée — cliquer pour réactiver"
            }
            aria-pressed={notifOn}
            aria-label={
              notifOn ? "Désactiver le son" : "Activer le son"
            }
            className={[
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold transition active:scale-95 border",
              notifOn
                ? "bg-gold/15 border-gold/50 text-brown"
                : "bg-cream border-terracotta/30 text-brown-light",
            ].join(" ")}
          >
            <span aria-hidden>{notifOn ? "🔔" : "🔕"}</span>
            <span className="hidden sm:inline">
              {notifOn ? "Son ON" : "Son OFF"}
            </span>
          </button>

          <Link
            href="/admin/parametres/tables"
            className="text-xs text-brown-light hover:text-brown font-semibold inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-terracotta/30 hover:bg-cream transition"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Configurer
          </Link>
        </div>
      </div>

      {/* ─── Top-level tabs ─────────────────────────── */}
      <div className="mb-5 flex items-center gap-1 p-1 rounded-2xl bg-white-warm border border-terracotta/20 w-full overflow-x-auto">
        <TopTab
          id="salle"
          active={tab === "salle"}
          onClick={() => setTab("salle")}
          label="Salle"
          icon="🍽"
          badge={busyCount}
        />
        <TopTab
          id="emporter"
          active={tab === "emporter"}
          onClick={() => setTab("emporter")}
          label="À emporter"
          icon="🥡"
          badge={takeawayOrders.length}
        />
        <TopTab
          id="livraison"
          active={tab === "livraison"}
          onClick={() => setTab("livraison")}
          label="Livraison"
          icon="🛵"
          badge={deliveryOrders.length}
        />
      </div>

      {/* ─── Tab content ─────────────────────────── */}
      <AnimatePresence mode="wait">
        {tab === "salle" && (
          <motion.div
            key="salle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {zones.length >= 2 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                <ZoneChip
                  active={zoneFilter === "all"}
                  onClick={() => setZoneFilter("all")}
                  label={`Toutes (${tables.length})`}
                />
                {zones.map((z) => {
                  const count = tables.filter(
                    (t) => (t.zone?.trim() || "") === z
                  ).length;
                  return (
                    <ZoneChip
                      key={z}
                      active={zoneFilter === z}
                      onClick={() => setZoneFilter(z)}
                      label={`${z} (${count})`}
                    />
                  );
                })}
              </div>
            )}

            {view === "plan" ? (
              <TablePlanCanvas
                tables={visibleTables}
                renderTable={(t) => {
                  const order = orderByTable.get(t.number);
                  const state = deriveTileState(order);
                  const styles = TILE_STYLES[state];
                  const elapsed = order
                    ? formatDuration(minutesSince(order.created_at))
                    : null;
                  return {
                    bg: styles.bg,
                    border: styles.border,
                    pulse: state === "prete",
                    label: t.label,
                    sublabel: order ? (
                      <>
                        {order.guest_count}c · {elapsed}
                      </>
                    ) : (
                      <>{t.capacity} pl</>
                    ),
                    onClick: () => router.push(`/staff/table/${t.number}`),
                  };
                }}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {visibleTables.map((t) => {
                  const order = orderByTable.get(t.number);
                  const state = deriveTileState(order);
                  return (
                    <TableTile
                      key={t.number}
                      config={t}
                      state={state}
                      order={order}
                      onClick={() => router.push(`/staff/table/${t.number}`)}
                    />
                  );
                })}
                {visibleTables.length === 0 && (
                  <div className="col-span-full p-8 rounded-2xl bg-white-warm border border-terracotta/20 text-center text-sm text-brown-light">
                    Aucune table dans cette zone.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {tab === "emporter" && (
          <motion.div
            key="emporter"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <OffsiteTab
              kind="takeaway"
              orders={takeawayOrders}
              onCreate={() => createOffsite("takeaway")}
              creating={creatingTakeaway === "takeaway"}
              onOpen={(id) => router.push(`/staff/order/${id}`)}
            />
          </motion.div>
        )}

        {tab === "livraison" && (
          <motion.div
            key="livraison"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            <OffsiteTab
              kind="delivery"
              orders={deliveryOrders}
              onCreate={() => createOffsite("delivery")}
              creating={creatingTakeaway === "delivery"}
              onOpen={(id) => router.push(`/staff/order/${id}`)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════ UI components ═══════════════ */

function TopTab({
  active,
  onClick,
  label,
  icon,
  badge,
}: {
  id: TabId;
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  badge: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 min-w-[128px] relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2",
        active
          ? "bg-brown text-cream shadow"
          : "text-brown-light hover:text-brown",
      ].join(" ")}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
      {badge > 0 && (
        <span
          className={[
            "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full tabular-nums",
            active
              ? "bg-gold text-brown"
              : "bg-gold/20 text-brown",
          ].join(" ")}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function ZoneChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full text-xs font-semibold transition",
        active
          ? "bg-brown text-cream"
          : "bg-white-warm text-brown-light border border-terracotta/30 hover:text-brown hover:border-terracotta/60",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function OffsiteTab({
  kind,
  orders,
  onCreate,
  creating,
  onOpen,
}: {
  kind: "takeaway" | "delivery";
  orders: OrderWithItems[];
  onCreate: () => void;
  creating: boolean;
  onOpen: (id: string) => void;
}) {
  const verb = kind === "takeaway" ? "à emporter" : "en livraison";
  const icon = kind === "takeaway" ? "🥡" : "🛵";
  const label = kind === "takeaway" ? "Emporter" : "Livraison";
  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <p className="text-sm text-brown-light">
          {orders.length === 0 ? (
            <>Aucune commande {verb} pour le moment.</>
          ) : (
            <>
              {orders.length} commande{orders.length > 1 ? "s" : ""} {verb}.
            </>
          )}
        </p>
        <button
          onClick={onCreate}
          disabled={creating}
          className="group relative inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-brown text-cream text-sm font-semibold tracking-wide shadow-lg shadow-brown/20 hover:bg-brown-light disabled:opacity-60 transition active:scale-95"
        >
          <span aria-hidden>{icon}</span>
          <span>
            Nouvelle commande {label.toLowerCase()}
          </span>
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-terracotta/25 bg-white-warm/50 py-16 text-center">
          <div className="text-4xl mb-3" aria-hidden>
            {icon}
          </div>
          <p className="text-sm text-brown-light max-w-md mx-auto px-6">
            Les commandes {verb} apparaîtront ici dès qu&apos;elles seront
            créées — depuis le plan de salle ou via une plateforme connectée.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence initial={false}>
            {orders.map((o) => (
              <motion.button
                key={o.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpen(o.id)}
                className="text-left bg-white-warm border border-terracotta/40 rounded-xl p-4 hover:border-gold transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-brown-light">
                    {label}
                  </span>
                  <span className="text-xs text-brown-light tabular-nums">
                    {formatDuration(minutesSince(o.created_at))}
                  </span>
                </div>
                <p className="mt-2 font-[family-name:var(--font-display)] text-lg text-brown font-semibold">
                  {o.items.length} article{o.items.length > 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-sm text-brown-light">
                  {formatCents(o.total_cents)}
                </p>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function TableTile({
  config,
  state,
  order,
  onClick,
}: {
  config: TableConfig;
  state: TileState;
  order?: OrderWithItems;
  onClick: () => void;
}) {
  const s = TILE_STYLES[state];
  const elapsed = order ? formatDuration(minutesSince(order.created_at)) : null;
  const pulse = state === "prete";

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={[
        "relative aspect-square min-h-[150px] md:min-h-[180px] rounded-2xl border-2 p-4 text-left",
        "transition-colors flex flex-col",
        s.bg,
        s.border,
        s.ink,
      ].join(" ")}
    >
      {pulse && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-2xl ring-4 ring-green-500/60 pointer-events-none"
          animate={{ opacity: [0.35, 1, 0.35], scale: [1, 1.02, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-[10px] uppercase tracking-[0.22em] text-brown-light/70">
            {config.zone || "Table"}
          </span>
        </div>
        <span
          className={[
            "text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded whitespace-nowrap",
            state === "libre"
              ? "bg-brown/5 text-brown-light/70"
              : state === "occupee"
                ? "bg-gold/20 text-gold"
                : state === "cuisine"
                  ? "bg-[#E67E22]/15 text-[#C56A19]"
                  : state === "prete"
                    ? "bg-green-500 text-white"
                    : state === "servie"
                      ? "bg-sky-500 text-white"
                      : "bg-brown/15 text-brown-light",
          ].join(" ")}
        >
          {s.label}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <span
          className="font-[family-name:var(--font-display)] font-bold leading-none text-center break-words"
          style={{
            fontSize:
              config.label.length <= 3
                ? "clamp(2.25rem, 6vw, 3.5rem)"
                : config.label.length <= 6
                  ? "clamp(1.5rem, 4vw, 2.25rem)"
                  : "clamp(1.1rem, 2.8vw, 1.5rem)",
          }}
        >
          {config.label || `T${config.number}`}
        </span>
      </div>

      <div className="mt-2 space-y-0.5 min-h-[2.4rem]">
        {order ? (
          <>
            <p className={`text-xs font-semibold ${s.accent}`}>
              {order.guest_count} couvert{order.guest_count > 1 ? "s" : ""} ·{" "}
              {elapsed}
            </p>
            {state === "prete" && (() => {
              const ready = order.items.filter((i) => i.status === "ready")
                .length;
              const total = order.items.filter(
                (i) => i.status !== "cancelled" && i.status !== "served"
              ).length;
              return (
                <p className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded inline-block">
                  ✓ {ready}/{total} plat{total > 1 ? "s" : ""} prêt
                  {ready > 1 ? "s" : ""}
                </p>
              );
            })()}
            {state === "cuisine" && (() => {
              const cooking = order.items.filter((i) => i.status === "cooking")
                .length;
              const ready = order.items.filter((i) => i.status === "ready")
                .length;
              return (
                <p className="text-[11px] font-medium text-[#C56A19]">
                  🔥 {cooking} en prépa
                  {ready > 0 ? ` · ✓ ${ready} prêt${ready > 1 ? "s" : ""}` : ""}
                </p>
              );
            })()}
            <p className="text-sm text-brown font-semibold tabular-nums">
              {formatCents(order.total_cents)}
            </p>
          </>
        ) : (
          <p className="text-xs text-brown-light/60">
            {config.capacity} couvert{config.capacity > 1 ? "s" : ""} · toucher
            pour ouvrir
          </p>
        )}
      </div>
    </motion.button>
  );
}
