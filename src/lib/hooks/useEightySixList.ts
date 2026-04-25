/**
 * Hook polling the public 86 list from /api/settings every ~20s.
 *
 * Used by every display surface that lists menu items (homepage /carte, the
 * QR menu, the POS item grid) so the customer never sees a sold-out plate as
 * available. Polling is fine because settings change rarely; we don't need a
 * dedicated realtime channel.
 */

"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 20_000;

export function useEightySixList(): Set<string> {
  const [list, setList] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function fetchOnce() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          eighty_six_list?: string[];
        };
        if (cancelled) return;
        const next = Array.isArray(data.eighty_six_list)
          ? data.eighty_six_list
          : [];
        setList((prev) => {
          /* Avoid a rerender when nothing changed. */
          if (
            prev.size === next.length &&
            next.every((id) => prev.has(id))
          ) {
            return prev;
          }
          return new Set(next);
        });
      } catch {
        /* Silent — next tick will retry. */
      }
    }

    fetchOnce();
    timer = window.setInterval(fetchOnce, POLL_INTERVAL_MS);

    /* Refresh when the tab regains focus — useful on the KDS TV returning
     * from screen-saver and on the server's phone coming out of lock. */
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchOnce();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return list;
}
