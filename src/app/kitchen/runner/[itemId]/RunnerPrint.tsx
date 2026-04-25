"use client";

/**
 * Runner ticket — mini paper marker placed on or next to the plate at the pass.
 *
 * Shows : table label, item (quantity × name), modifiers, special flags,
 * server name, ready time. Auto-prints ~400ms after load and self-closes
 * 1.2s after the print dialog finishes — so the chef can fire several plates
 * in a row without managing a forest of stale tabs.
 */

import { useEffect, useRef, useState } from "react";
import type {
  OrderItem,
  OrderWithItems,
  OrderFlag,
} from "@/lib/db/pos-types";
import { ORDER_FLAGS_META } from "@/lib/db/pos-types";

type Props = {
  itemId: string;
  brandName?: string;
};

type LoadState = "loading" | "ready" | "printed" | "error";

interface RunnerData {
  item: OrderItem;
  order: OrderWithItems;
}

function formatHM(iso: string | null | undefined): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const SOURCE_LABELS: Record<string, string> = {
  dine_in: "Salle",
  dine_in_qr: "Salle · QR",
  takeaway: "À emporter",
  delivery: "Livraison",
};

export default function RunnerPrint({ itemId, brandName = "Service" }: Props) {
  const [data, setData] = useState<RunnerData | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const printedRef = useRef(false);

  /* ── Fetch the parent order, then locate the item ─────── */
  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    (async () => {
      try {
        /* Look up the order_item directly via a dedicated endpoint to avoid
         * needing the order id in the URL. The endpoint joins to the order. */
        const res = await fetch(`/api/staff/items/${itemId}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(
            res.status === 404 ? "Item introuvable" : `HTTP ${res.status}`
          );
        }
        const body = (await res.json()) as RunnerData;
        if (cancelled) return;
        setData(body);
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
  }, [itemId]);

  /* ── Auto-print + auto-close ───────────────────────────── */
  useEffect(() => {
    if (state !== "ready" || printedRef.current) return;
    printedRef.current = true;
    const t = window.setTimeout(() => {
      try {
        window.print();
      } catch {
        /* manual fallback */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    function onAfter() {
      setState((s) => (s === "ready" ? "printed" : s));
      /* Close 1.2s after the print dialog so the chef sees the ✓ confirm. */
      window.setTimeout(() => window.close(), 1200);
    }
    window.addEventListener("afterprint", onAfter);
    return () => window.removeEventListener("afterprint", onAfter);
  }, []);

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
        Chargement du bon…
      </div>
    );
  }

  if (state === "error" || !data) {
    return (
      <div
        style={{
          padding: "40px 20px",
          fontFamily: "'Courier New', Consolas, monospace",
          color: "#e8c97a",
          textAlign: "center",
        }}
      >
        <p style={{ marginBottom: 12 }}>Bon introuvable.</p>
        <p style={{ color: "#cfc4b5", fontSize: 12 }}>
          {errMsg || "Erreur inconnue"}
        </p>
        <button onClick={() => window.close()} style={btnStyle}>
          Fermer
        </button>
      </div>
    );
  }

  const { item, order } = data;
  const flags = (order.flags ?? []) as OrderFlag[];
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
      {/* Toolbar — hidden on print */}
      <div
        className="no-print"
        style={{
          width: "100%",
          maxWidth: 320,
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button onClick={() => window.print()} style={btnPrimary}>
          Imprimer
        </button>
        <button onClick={() => window.close()} style={btnStyle}>
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

      {/* Mini printable runner ticket — 60mm wide */}
      <article
        className="ticket-printable"
        style={{
          width: "60mm",
          maxWidth: "100%",
          background: "#ffffff",
          color: "#000000",
          fontFamily: "'Courier New', Consolas, monospace",
          fontSize: 13,
          lineHeight: 1.3,
          padding: "5mm 4mm",
          boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Rule />
          <div
            style={{
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: 0.8,
            }}
          >
            Bon de service · {brandName}
          </div>

          {/* Table or source — gigantic */}
          <div
            style={{
              fontWeight: 900,
              fontSize: 28,
              letterSpacing: "0.04em",
              margin: "8px 0 4px",
            }}
          >
            {order.table_number != null
              ? `TABLE ${order.table_number}`
              : sourceLabel.toUpperCase()}
          </div>
        </div>

        {/* Flags banner — only the dominant one, in HUGE type */}
        {flags.length > 0 && (
          <div
            style={{
              border: "2px solid #000",
              padding: "6px 4px",
              textAlign: "center",
              margin: "6px 0",
            }}
          >
            {flags.map((flag) => {
              const meta = ORDER_FLAGS_META[flag];
              if (!meta) return null;
              return (
                <div
                  key={flag}
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    margin: "2px 0",
                  }}
                >
                  ▶ {meta.label} ◀
                </div>
              );
            })}
          </div>
        )}

        <Rule />

        {/* The plate itself */}
        <div style={{ margin: "8px 0", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>
            {item.quantity}× {item.menu_item_name.toUpperCase()}
          </div>
          {item.modifiers && item.modifiers.length > 0 && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                fontStyle: "italic",
              }}
            >
              → {item.modifiers.join(" · ")}
            </div>
          )}
          {item.notes && item.notes.trim().length > 0 && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              ⚠ {item.notes}
            </div>
          )}
        </div>

        <Rule />

        {/* Footer meta */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
          }}
        >
          <span>
            {order.staff_name ? `Serv. ${order.staff_name}` : "Service"}
          </span>
          <span>Prêt {formatHM(item.ready_at)}</span>
        </div>

        <div style={{ height: "5mm" }} aria-hidden />
      </article>
    </div>
  );
}

function Rule() {
  return (
    <div
      style={{
        letterSpacing: 0,
        fontWeight: 700,
        margin: "4px 0",
        userSelect: "none",
      }}
    >
      ────────────────────────
    </div>
  );
}

const btnStyle: React.CSSProperties = {
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

const btnPrimary: React.CSSProperties = {
  ...btnStyle,
  background: "#B8922F",
  color: "#1a0f0a",
  border: "1px solid #B8922F",
};
