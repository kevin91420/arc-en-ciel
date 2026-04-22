/**
 * SUPABASE REALTIME CLIENT — Singleton browser client for Realtime subscriptions.
 * Only used on the client (admin pages). Uses the anon/publishable key
 * (safe to expose), NOT the service role.
 *
 * If NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing,
 * returns null — callers fall back to polling.
 */
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
let _initialized = false;

export function getRealtimeClient(): SupabaseClient | null {
  if (_initialized) return _client;
  _initialized = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (typeof window !== "undefined") {
      console.info(
        "[realtime] Supabase Realtime not configured — falling back to polling"
      );
    }
    return null;
  }

  _client = createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
    auth: { persistSession: false }, // admin auth is already handled by our cookie middleware
  });
  return _client;
}

export function isRealtimeEnabled(): boolean {
  return getRealtimeClient() !== null;
}
