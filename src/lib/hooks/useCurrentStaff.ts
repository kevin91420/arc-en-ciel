"use client";

/**
 * USE CURRENT STAFF — hook client pour récupérer le staff connecté + ses
 * permissions. Cache en mémoire 30s, revalide sur visibilité.
 *
 * Sprint 7b QW#9 — permissions multi-niveaux.
 *
 * Usage :
 *   const { staff, hasPerm, loading } = useCurrentStaff();
 *   if (hasPerm("order.cancel")) { ... }
 *
 * Pour wrapper du contenu, voir <PermGate> dans @/components/PermGate.
 */

import { useEffect, useState } from "react";
import type { Permission, StaffRole } from "@/lib/auth/roles";

export interface CurrentStaffView {
  id: string;
  name: string;
  role: StaffRole | null;
  color: string;
}

interface MeResponse {
  staff: CurrentStaffView;
  permissions: Permission[];
}

/* Cache module-level — partagé entre tous les composants pour ne pas
 * faire 5 appels /api/staff/me par page. */
let cache: MeResponse | null = null;
let cacheAt = 0;
const TTL_MS = 30_000;
let inflightPromise: Promise<MeResponse | null> | null = null;

async function fetchMe(): Promise<MeResponse | null> {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      const res = await fetch("/api/staff/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as MeResponse;
      cache = data;
      cacheAt = Date.now();
      return data;
    } catch {
      return null;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

/**
 * Invalide le cache (à appeler après un logout / changement de rôle).
 */
export function invalidateMeCache(): void {
  cache = null;
  cacheAt = 0;
}

export interface UseCurrentStaffResult {
  staff: CurrentStaffView | null;
  permissions: Permission[];
  loading: boolean;
  /** Helper : vérifie si le staff a une permission donnée */
  hasPerm: (perm: Permission) => boolean;
  /** Helper : vérifie si le staff a un rôle donné (exact match) */
  hasRole: (role: StaffRole) => boolean;
  /** Refetch manuellement (ex après update via /admin/staff) */
  refresh: () => Promise<void>;
}

export function useCurrentStaff(): UseCurrentStaffResult {
  const [data, setData] = useState<MeResponse | null>(cache);
  const [loading, setLoading] = useState<boolean>(!cache);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const next = await fetchMe();
      if (!cancelled) {
        setData(next);
        setLoading(false);
      }
    };
    load();

    /* Revalide quand l'utilisateur revient sur l'onglet (ex après update
     * de son rôle par le manager dans une autre fenêtre). */
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        invalidateMeCache();
        load();
      }
    };
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const permSet = new Set(data?.permissions ?? []);

  return {
    staff: data?.staff ?? null,
    permissions: data?.permissions ?? [],
    loading,
    hasPerm: (perm: Permission) => permSet.has(perm),
    hasRole: (role: StaffRole) => data?.staff.role === role,
    refresh: async () => {
      invalidateMeCache();
      setLoading(true);
      const next = await fetchMe();
      setData(next);
      setLoading(false);
    },
  };
}
