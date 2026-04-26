/**
 * useMenu — fetch the live catalogue from /api/menu with a same-page cache.
 *
 * Falls back to an empty list while loading. The view layer should treat
 * `loading: true` as a skeleton hint, not a hard block — the static CARTE
 * fallback will hydrate from the API a moment later if the DB is empty.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { CARTE, type MenuCategory, type MenuItem } from "@/data/carte";
import { stationForCategory } from "@/app/staff/_lib/menu";
import { parsePriceToCents } from "@/lib/format";
import type {
  DietaryTag,
  MenuCategoryFull,
  MenuItemFull,
} from "@/lib/db/menu-types";

const POLL_MS = 30_000;

let cache: MenuCategoryFull[] | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 30_000;

function staticFallback(): MenuCategoryFull[] {
  return CARTE.map((cat: MenuCategory, ci: number) => ({
    id: cat.id,
    number: cat.number,
    title: cat.title,
    subtitle: cat.subtitle ?? null,
    intro: cat.intro ?? null,
    icon: cat.icon,
    station: stationForCategory(cat.id),
    position: ci,
    active: true,
    modifiers: [],
    items: cat.items.map(
      (it: MenuItem, i: number): MenuItemFull => ({
        id: it.id,
        category_id: cat.id,
        name: it.name,
        description: it.description,
        price_cents: parsePriceToCents(it.price),
        image_url: it.image ?? null,
        signature: Boolean(it.signature),
        popular: Boolean(it.popular),
        chef: Boolean(it.chef),
        tags: (it.tags as DietaryTag[] | undefined) ?? [],
        position: i,
        active: true,
        variants: [],
        modifiers: [],
      })
    ),
  }));
}

async function fetchMenu(): Promise<MenuCategoryFull[]> {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache;
  try {
    const res = await fetch("/api/menu", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as MenuCategoryFull[];
    if (Array.isArray(data) && data.length > 0) {
      cache = data;
      cacheAt = Date.now();
      return data;
    }
    /* Empty payload — keep static fallback so the UI never goes blank. */
    return staticFallback();
  } catch {
    return staticFallback();
  }
}

export function useMenu(): {
  menu: MenuCategoryFull[];
  loading: boolean;
} {
  const [menu, setMenu] = useState<MenuCategoryFull[]>(
    cache ?? staticFallback()
  );
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const refresh = async () => {
      const data = await fetchMenu();
      if (!cancelled) {
        setMenu(data);
        setLoading(false);
      }
    };

    refresh();
    timer = window.setInterval(refresh, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { menu, loading };
}

/** Editorial-shape adapter (matches `carte.ts` MenuCategory[]) for legacy
 * components that haven't been refactored yet. Builds the price label from
 * cents using French formatting. */
export function asEditorialShape(menu: MenuCategoryFull[]): MenuCategory[] {
  const fmt = (cents: number) =>
    `${(cents / 100)
      .toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .replace(",00", ",00")} €`;
  return menu.map((c) => ({
    id: c.id,
    number: c.number,
    title: c.title,
    subtitle: c.subtitle ?? "",
    intro: c.intro ?? "",
    icon: c.icon,
    items: c.items.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      price: fmt(it.price_cents),
      image: it.image_url ?? undefined,
      tags: it.tags,
      signature: it.signature,
      popular: it.popular,
      chef: it.chef,
    })),
  }));
}

/** Same as asEditorialShape but memoised across renders. */
export function useEditorialMenu(): MenuCategory[] {
  const { menu } = useMenu();
  return useMemo(() => asEditorialShape(menu), [menu]);
}
