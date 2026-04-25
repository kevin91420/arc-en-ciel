"use client";

/**
 * Kitchen ticket — ESC/POS-style thermal print (80mm wide, monospace).
 *
 * - Fetches the order from `/api/staff/orders/[id]` (staff cookie auth).
 * - Groups items by station (pizza / grill / cold / dessert / bar / main).
 * - Auto-triggers window.print() ~500ms after load.
 * - Manual "Imprimer" fallback + "Fermer" button.
 * - After print, shows an "Imprimé" confirmation state.
 *
 * Styling: inline styles only for the printable area. Global print CSS
 * (`@page size: 80mm auto`) lives in `src/app/globals.css`.
 */

import { useEffect, useRef, useState } from "react";
import type {
  OrderWithItems,
  OrderItem,
  Station,
  OrderFlag,
} from "@/lib/db/pos-types";
import { ORDER_FLAGS_META } from "@/lib/db/pos-types";

/* ═══════════════════════════════════════════════════════════
   Config
   ═══════════════════════════════════════════════════════════ */

const STATION_LABELS: Record<Station, string> = {
  main: "CUISINE",
  pizza: "PIZZA",
  grill: "GRILL",
  cold: "FROID",
  dessert: "DESSERT",
  bar: "BAR",
};

/** Display order on the ticket. */
const STATION_ORDER: Station[] = [
  "pizza",
  "grill",
  "main",
  "cold",
  "dessert",
  "bar",
];

const SOURCE_LABELS: Record<string, string> = {
  dine_in: "Salle",
  dine_in_qr: "Salle · QR",
  takeaway: "À emporter",
  delivery: "Livraison",
};

/* ═══════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════ */

function formatHM(iso: string | null | undefined): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesSince(iso: string | null | undefined, now: number): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 60000));
}

function groupByStation(items: OrderItem[]): Map<Station, OrderItem[]> {
  const map = new Map<Station, OrderItem[]>();
  for (const item of items) {
    if (item.status === "cancelled") continue;
    const station = (item.station || "main") as Station;
    const list = map.get(station);
    if (list) list.push(item);
    else map.set(station, [item]);
  }
  return map;
}

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */

type Props = { orderId: string; brandName?: string };

type PrintState = "loading" | "ready" | "printed" | "error";

export default function TicketPrint({ orderId, brandName = "Cuisine" }: Props) {
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [state, setState] = useState<PrintState>("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const printedRef = useRef(false);

  /* ── Fetch order ────────────────────────────────────────── */
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/staff/orders/${orderId}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Commande introuvable"
              : `HTTP ${res.status}`
          );
        }
        const data = (await res.json()) as OrderWithItems;
        if (cancelled) return;
        setOrder(data);
        setState("ready");
      } catch (e) {
        if (cancelled) return;
        setErrMsg((e as Error).message);
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  /* ── Auto-print ~500ms after content is ready ──────────── */
  useEffect(() => {
    if (state !== "ready" || printedRef.current) return;
    printedRef.current = true;
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {
        /* manual fallback button */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [state]);

  /* ── Listen to afterprint to show "Imprimé" state ──────── */
  useEffect(() => {
    const onAfter = () => setState((s) => (s === "ready" ? "printed" : s));
    window.addEventListener("afterprint", onAfter);
    return () => window.removeEventListener("afterprint", onAfter);
  }, []);

  /* ── States ────────────────────────────────────────────── */
  if (state === "loading") {
    return (
      <div
        style={{
          padding: "40px 20px",
          fontFamily: "'Courier New', Consolas, monospace",
          color: "#cfc4b5",
          textAlign: "center",
        }}
      >
        Chargement du ticket…
      </div>
    );
  }

  if (state === "error" || !order) {
    return (
      <div
        style={{
          padding: "40px 20px",
          fontFamily: "'Courier New', Consolas, monospace",
          color: "#e8c97a",
          textAlign: "center",
        }}
      >
        <p style={{ marginBottom: 12 }}>
          Impossible de charger le ticket.
        </p>
        <p style={{ color: "#cfc4b5", fontSize: 12 }}>
          {errMsg || "Erreur inconnue"}
        </p>
        <button
          onClick={() => window.close()}
          style={toolbarButtonStyle}
        >
          Fermer
        </button>
      </div>
    );
  }

  /* ── Layout ────────────────────────────────────────────── */

  const activeItems = order.items.filter((i) => i.status !== "cancelled");
  const grouped = groupByStation(activeItems);
  const now = Date.now();
  const elapsed = minutesSince(
    order.fired_at || order.created_at,
    now
  );
  const firedLabel = formatHM(order.fired_at || order.created_at);
  const sourceLabel = SOURCE_LABELS[order.source] ?? order.source;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a0f0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 8px 40px",
      }}
    >
      {/* Screen-only toolbar — hidden on print */}
      <div
        className="no-print"
        style={{
          width: "100%",
          maxWidth: 360,
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button onClick={() => window.print()} style={toolbarButtonPrimary}>
          Imprimer
        </button>
        <button onClick={() => window.close()} style={toolbarButtonStyle}>
          Fermer
        </button>
        {state === "printed" && (
          <span
            style={{
              alignSelf: "center",
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(74,163,92,0.15)",
              color: "#7ed19a",
              fontFamily: "'Courier New', Consolas, monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Imprimé ✓
          </span>
        )}
      </div>

      {/* Printable ticket — 80mm wide, monospace */}
      <article
        className="ticket-printable"
        style={{
          width: "80mm",
          maxWidth: "100%",
          background: "#ffffff",
          color: "#000000",
          fontFamily: "'Courier New', Consolas, monospace",
          fontSize: 14,
          lineHeight: 1.35,
          padding: "6mm 4mm",
          boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)",
        }}
      >
        {/* ═══ Header ═══ */}
        <div style={{ textAlign: "center" }}>
          <RuleDouble />
          <div
            style={{
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "0.08em",
              margin: "4px 0 2px",
              textTransform: "uppercase",
            }}
          >
            {brandName}
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.12em",
            }}
          >
            CUISINE · Ticket #{order.id.slice(0, 6).toUpperCase()}
          </div>
          <RuleDouble />
        </div>

        {/* ═══ Special flags banner ═══ */}
        {order.flags && order.flags.length > 0 && (
          <div
            style={{
              marginTop: 8,
              marginBottom: 6,
              border: "2px solid #000",
              padding: "6px 4px",
              textAlign: "center",
            }}
          >
            {(order.flags as OrderFlag[]).map((flag) => {
              const meta = ORDER_FLAGS_META[flag];
              if (!meta) return null;
              return (
                <div
                  key={flag}
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    margin: "2px 0",
                  }}
                >
                  ▶ {meta.label.toUpperCase()} ◀
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ Meta ═══ */}
        <div style={{ marginTop: 8, marginBottom: 6 }}>
          {order.table_number != null ? (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 800 }}>
                Table {order.table_number}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {order.guest_count} couvert
                {order.guest_count > 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 18, fontWeight: 800 }}>{sourceLabel}</div>
          )}

          {order.staff_name && (
            <div style={{ marginTop: 2 }}>Serveur: {order.staff_name}</div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Lancé:&nbsp;&nbsp;{firedLabel}</span>
            <span>Ticket: {elapsed} min</span>
          </div>
        </div>

        <RuleSingle />

        {/* ═══ Items grouped by station ═══ */}
        {STATION_ORDER.filter((s) => grouped.has(s)).map((station, idx, arr) => {
          const items = grouped.get(station) ?? [];
          return (
            <div key={station} style={{ marginTop: idx === 0 ? 4 : 0 }}>
              <StationHeader label={STATION_LABELS[station]} />
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "4px 0 8px",
                }}
              >
                {items.map((item) => (
                  <TicketItem key={item.id} item={item} />
                ))}
              </ul>
              {idx < arr.length - 1 && <RuleSingle />}
            </div>
          );
        })}

        {/* Fallback when no active items are present */}
        {grouped.size === 0 && (
          <div
            style={{
              padding: "10px 0",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            (aucun plat)
          </div>
        )}

        {/* ═══ Order-level notes ═══ */}
        {order.notes && order.notes.trim().length > 0 && (
          <>
            <RuleSingle />
            <div style={{ marginTop: 6 }}>
              <div style={{ fontWeight: 800 }}>NOTES:</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{order.notes}</div>
            </div>
          </>
        )}

        {/* ═══ Footer ═══ */}
        <div style={{ marginTop: 10, textAlign: "center" }}>
          <RuleDouble />
          <div style={{ fontWeight: 800, padding: "4px 0" }}>Bon service !</div>
          <RuleDouble />
        </div>

        {/* Paper cut whitespace */}
        <div style={{ height: "8mm" }} aria-hidden />
      </article>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════ */

function TicketItem({ item }: { item: OrderItem }) {
  return (
    <li style={{ padding: "2px 0", pageBreakInside: "avoid" }}>
      <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.02em" }}>
        {item.quantity}x {item.menu_item_name.toUpperCase()}
      </div>
      {item.modifiers && item.modifiers.length > 0 && (
        <div
          style={{
            paddingLeft: "4mm",
            fontSize: 12,
            fontStyle: "italic",
          }}
        >
          → {item.modifiers.join(", ")}
        </div>
      )}
      {item.notes && item.notes.trim().length > 0 && (
        <div
          style={{
            paddingLeft: "4mm",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          ⚠ {item.notes}
        </div>
      )}
    </li>
  );
}

function StationHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        fontWeight: 800,
        fontSize: 16,
        letterSpacing: "0.1em",
        marginTop: 6,
        marginBottom: 2,
      }}
    >
      [STATION] {label}
    </div>
  );
}

function RuleDouble() {
  // Roughly fills the 80mm width at 14px monospace (~28 chars).
  return (
    <div style={{ letterSpacing: 0, fontWeight: 700, userSelect: "none" }}>
      ═══════════════════════════════
    </div>
  );
}

function RuleSingle() {
  return (
    <div
      style={{
        letterSpacing: 0,
        fontWeight: 700,
        margin: "6px 0",
        userSelect: "none",
      }}
    >
      ───────────────────────────────
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Toolbar button styles (screen-only)
   ═══════════════════════════════════════════════════════════ */

const toolbarButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid rgba(253,248,240,0.2)",
  background: "rgba(253,248,240,0.06)",
  color: "#FDF8F0",
  fontFamily: "'Courier New', Consolas, monospace",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const toolbarButtonPrimary: React.CSSProperties = {
  ...toolbarButtonStyle,
  background: "#B8922F",
  color: "#1a0f0a",
  border: "1px solid #B8922F",
};
