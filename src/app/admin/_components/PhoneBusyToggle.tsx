"use client";

/**
 * PhoneBusyToggle — petit toggle live dans la top bar admin pour activer
 * le mode "IA prend tous les appels" en 1 clic pendant un rush.
 *
 * Sprint 7b QW#10. Affiché uniquement si la config IA téléphone est active
 * (mode != "off"). Visuellement discret quand inactif, mis en valeur quand
 * actif (gold pulsing border).
 *
 * Auto-poll toutes les 60s pour rester sync avec une autre fenêtre/tab.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { PhoneAIConfig } from "@/lib/db/phone-types";

export default function PhoneBusyToggle() {
  const [config, setConfig] = useState<PhoneAIConfig | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/telephony/config", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { config: PhoneAIConfig };
      setConfig(data.config);
    } catch {
      /* swallow */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  /* Ne rien afficher si IA téléphone est complètement off */
  if (!config || config.mode === "off") return null;

  async function toggle() {
    if (busy || !config) return;
    setBusy(true);
    try {
      const next = !config.busy_override_active;
      await fetch("/api/admin/telephony/busy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next, duration_minutes: 120 }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const active = config.busy_override_active;

  return (
    <motion.button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={
        active
          ? "Mode rush actif : l'IA prend tous les appels. Cliquer pour désactiver."
          : "Activer le mode rush (l'IA prend tous les appels pendant 2h)."
      }
      className={[
        "relative inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-bold uppercase tracking-wider transition active:scale-95",
        active
          ? "bg-gold text-brown shadow-md shadow-gold/40"
          : "bg-cream text-brown-light hover:text-brown border border-terracotta/30",
      ].join(" ")}
      animate={
        active
          ? {
              boxShadow: [
                "0 0 0 0 rgba(184,146,47,0.45)",
                "0 0 0 8px rgba(184,146,47,0)",
                "0 0 0 0 rgba(184,146,47,0)",
              ],
            }
          : undefined
      }
      transition={
        active ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined
      }
    >
      <span aria-hidden className="text-base leading-none">
        {active ? "🔥" : "🤖"}
      </span>
      <span className="hidden sm:inline">
        {active ? "IA Rush" : "Quick AI"}
      </span>
      {active && config.busy_override_until && (
        <span className="hidden md:inline text-[9px] opacity-70 normal-case ml-1">
          jusqu&apos;à{" "}
          {new Date(config.busy_override_until).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </motion.button>
  );
}
