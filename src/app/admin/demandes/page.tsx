"use client";

/**
 * Waiter-call live board. Polls /api/waiter?status=pending every 5s for the
 * "live" tab, and pulls /api/waiter once for history (last 24 h, all non-
 * pending statuses) when the history tab is active.
 *
 * Urgent threshold: > 3 min since created_at.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { WaiterCall } from "@/lib/db/types";
import { minutesAgo, relativeFr } from "../_lib/format";

const LIVE_REFRESH_MS = 5_000;
const URGENT_MIN = 3;

type Tab = "live" | "history";

export default function DemandesPage() {
  const [tab, setTab] = useState<Tab>("live");
  const [pending, setPending] = useState<WaiterCall[]>([]);
  const [history, setHistory] = useState<WaiterCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadLive = useCallback(async () => {
    try {
      const res = await fetch("/api/waiter?status=pending", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const data: WaiterCall[] = await res.json();
      setPending(data);
    } catch {
      /* quietly ignore — will retry on next tick */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/waiter", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const all: WaiterCall[] = await res.json();
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      setHistory(
        all
          .filter(
            (c) => c.status !== "pending" && new Date(c.created_at).getTime() >= cutoff
          )
          .sort(
            (a, b) =>
              new Date(b.resolved_at || b.created_at).getTime() -
              new Date(a.resolved_at || a.created_at).getTime()
          )
      );
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  /* polling for live tab only — history is static when viewing */
  useEffect(() => {
    setLoading(true);
    if (tab === "live") {
      loadLive();
      timer.current = setInterval(loadLive, LIVE_REFRESH_MS);
    } else {
      loadHistory();
    }
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [tab, loadLive, loadHistory]);

  async function updateStatus(
    id: string,
    status: "in_progress" | "resolved"
  ) {
    setUpdating((s) => new Set(s).add(id));
    try {
      const res = await fetch(`/api/waiter/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      if (status === "resolved") {
        setPending((p) => p.filter((c) => c.id !== id));
      } else {
        await loadLive();
      }
    } catch {
      alert("Impossible de mettre à jour la demande.");
    } finally {
      setUpdating((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gold font-semibold">
            Service en salle
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl md:text-4xl text-brown">
            Demandes des tables
          </h1>
          {tab === "live" && (
            <p className="mt-1 text-xs text-brown-light flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-red animate-pulse" />
              Rafraîchissement automatique toutes les 5 s
            </p>
          )}
        </div>

        <div className="flex bg-white-warm border border-terracotta/40 rounded-lg p-1">
          <TabButton active={tab === "live"} onClick={() => setTab("live")}>
            En direct
            {pending.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red text-cream text-[10px] font-bold">
                {pending.length}
              </span>
            )}
          </TabButton>
          <TabButton active={tab === "history"} onClick={() => setTab("history")}>
            Historique 24 h
          </TabButton>
        </div>
      </div>

      {tab === "live" ? (
        loading && pending.length === 0 ? (
          <div className="p-10 bg-white-warm rounded-xl border border-terracotta/30 text-center text-brown-light">
            Chargement…
          </div>
        ) : pending.length === 0 ? (
          <div className="p-12 bg-white-warm rounded-xl border border-terracotta/30 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-gold/15 text-gold flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-[family-name:var(--font-display)] text-xl text-brown font-semibold">
              Tout est calme
            </p>
            <p className="text-sm text-brown-light mt-1">
              Aucune demande en attente. Bonne soirée !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence initial={false}>
              {pending.map((c) => {
                const urgent = minutesAgo(c.created_at) > URGENT_MIN;
                const busy = updating.has(c.id);
                return (
                  <motion.article
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={[
                      "relative rounded-xl p-5 flex gap-4 overflow-hidden",
                      urgent
                        ? "bg-red/8 border-2 border-red shadow-lg shadow-red/20"
                        : "bg-white-warm border border-terracotta/40",
                    ].join(" ")}
                    style={urgent ? { backgroundColor: "rgba(192, 57, 43, 0.08)" } : undefined}
                  >
                    {urgent && (
                      <span className="absolute top-3 right-3 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red" />
                      </span>
                    )}
                    <div
                      className={[
                        "w-20 h-20 rounded-xl flex flex-col items-center justify-center shrink-0",
                        urgent
                          ? "bg-red text-cream"
                          : "bg-brown text-gold-light",
                      ].join(" ")}
                    >
                      <span className="text-[9px] tracking-widest uppercase opacity-70">
                        Table
                      </span>
                      <span className="font-[family-name:var(--font-display)] text-3xl font-bold leading-none">
                        {c.table_number}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brown-light font-semibold uppercase tracking-wider">
                        {c.status === "in_progress" ? "En cours" : "Demande"}
                      </p>
                      <p className="font-[family-name:var(--font-display)] text-xl text-brown font-semibold mt-0.5 break-words">
                        {c.request_type}
                      </p>
                      <p
                        className={
                          urgent
                            ? "text-sm text-red font-semibold mt-1"
                            : "text-sm text-brown-light mt-1"
                        }
                      >
                        {relativeFr(c.created_at)}
                        {urgent && " · Urgent"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {c.status === "pending" && (
                          <button
                            onClick={() => updateStatus(c.id, "in_progress")}
                            disabled={busy}
                            className="text-xs font-semibold px-3 py-1.5 rounded bg-gold/20 text-gold hover:bg-gold hover:text-brown disabled:opacity-50 transition"
                          >
                            Prendre en charge
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(c.id, "resolved")}
                          disabled={busy}
                          className="text-xs font-semibold px-3 py-1.5 rounded bg-brown text-cream hover:bg-brown-light disabled:opacity-50 transition"
                        >
                          {busy ? "…" : "Marquer résolue"}
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )
      ) : loading ? (
        <div className="p-10 bg-white-warm rounded-xl border border-terracotta/30 text-center text-brown-light">
          Chargement…
        </div>
      ) : history.length === 0 ? (
        <div className="p-10 bg-white-warm rounded-xl border border-terracotta/30 text-center text-brown-light italic">
          Aucune demande dans les 24 dernières heures.
        </div>
      ) : (
        <div className="bg-white-warm rounded-xl border border-terracotta/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream/60 text-xs uppercase tracking-wider text-brown-light">
              <tr>
                <th className="px-4 py-3 text-center font-semibold">Table</th>
                <th className="px-4 py-3 text-left font-semibold">Demande</th>
                <th className="px-4 py-3 text-left font-semibold">Statut</th>
                <th className="px-4 py-3 text-left font-semibold">Reçue</th>
                <th className="px-4 py-3 text-left font-semibold">Résolue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terracotta/25">
              {history.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-center font-[family-name:var(--font-display)] text-xl font-semibold text-brown">
                    {c.table_number}
                  </td>
                  <td className="px-4 py-3 text-brown">{c.request_type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded",
                        c.status === "resolved"
                          ? "bg-emerald-100 text-emerald-700"
                          : c.status === "cancelled"
                            ? "bg-red/10 text-red"
                            : "bg-gold/15 text-gold",
                      ].join(" ")}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-brown-light">
                    {new Date(c.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-brown-light">
                    {c.resolved_at
                      ? new Date(c.resolved_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded transition flex items-center ${
        active
          ? "bg-brown text-cream"
          : "text-brown-light hover:text-brown"
      }`}
    >
      {children}
    </button>
  );
}
