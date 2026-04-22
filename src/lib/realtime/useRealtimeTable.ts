/**
 * useRealtimeTable — Hook React qui écoute les changements d'une table Supabase
 * en temps réel et appelle onChange quand quelque chose bouge.
 *
 * Usage:
 *   useRealtimeTable("reservations", () => refresh());
 *
 * Si Realtime n'est pas configuré, retourne { connected: false } et le caller
 * doit fallback sur du polling.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getRealtimeClient } from "./client";

export type TableChange = {
  event: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  newRow?: Record<string, unknown>;
  oldRow?: Record<string, unknown>;
};

export function useRealtimeTable(
  tables: string | string[],
  onChange: (change: TableChange) => void
) {
  const [connected, setConnected] = useState(false);
  const savedCallback = useRef(onChange);

  /* Keep the latest onChange without re-subscribing every render */
  useEffect(() => {
    savedCallback.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const client = getRealtimeClient();
    if (!client) {
      setConnected(false);
      return;
    }

    const tableList = Array.isArray(tables) ? tables : [tables];
    const channels: RealtimeChannel[] = [];

    tableList.forEach((table) => {
      const channel = client
        .channel(`realtime:public:${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => {
            savedCallback.current({
              event: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
              table,
              newRow: payload.new as Record<string, unknown> | undefined,
              oldRow: payload.old as Record<string, unknown> | undefined,
            });
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setConnected(true);
          if (status === "CLOSED" || status === "CHANNEL_ERROR")
            setConnected(false);
        });
      channels.push(channel);
    });

    return () => {
      channels.forEach((ch) => {
        ch.unsubscribe();
        client.removeChannel(ch);
      });
      setConnected(false);
    };
  }, [Array.isArray(tables) ? tables.join(",") : tables]);

  return { connected };
}
