/**
 * Station configuration for the KDS.
 *
 * Each real cooking station has its own visual identity (color, icon) that
 * is used across the kitchen UI: the station picker tiles, the colored band
 * at the top of /kitchen/[station], and the "change station" selector.
 *
 * The `all` entry is the chef-principal view (no filtering).
 */

import type { Station } from "@/lib/db/pos-types";

export type StationKey = Station | "all";

export interface StationConfig {
  key: StationKey;
  label: string;
  /** Accent color — used for the header band, tile, and chip. */
  color: string;
  /** Readable foreground on top of `color`. Hard-coded for contrast. */
  onColor: string;
  /** Single emoji used on tiles / in the header. */
  icon: string;
  /** Short tagline that humanises the station for the picker tiles. */
  tagline: string;
}

export const STATIONS_CONFIG: Record<Exclude<StationKey, "all">, StationConfig> = {
  main: {
    key: "main",
    label: "Cuisine",
    color: "#B8922F",
    onColor: "#1a0f0a",
    icon: "🍴",
    tagline: "Plats principaux",
  },
  pizza: {
    key: "pizza",
    label: "Pizza",
    color: "#C0392B",
    onColor: "#fff5ec",
    icon: "🔥",
    tagline: "Four à bois",
  },
  grill: {
    key: "grill",
    label: "Grillades",
    color: "#8B4513",
    onColor: "#fff5ec",
    icon: "🥩",
    tagline: "Viandes & poissons",
  },
  cold: {
    key: "cold",
    label: "Froid",
    color: "#5BB4A1",
    onColor: "#0a1f1a",
    icon: "🥗",
    tagline: "Entrées & salades",
  },
  dessert: {
    key: "dessert",
    label: "Desserts",
    color: "#E8C97A",
    onColor: "#1a0f0a",
    icon: "🍰",
    tagline: "Pâtisserie",
  },
  bar: {
    key: "bar",
    label: "Bar",
    color: "#2C1810",
    onColor: "#E8C97A",
    icon: "🍷",
    tagline: "Boissons",
  },
};

/** View-all (chef principal) config, kept separate because it isn't a real station. */
export const ALL_STATION_CONFIG: StationConfig = {
  key: "all",
  label: "Tout voir",
  color: "#1a0f0a",
  onColor: "#E8C97A",
  icon: "📋",
  tagline: "Vue chef principal",
};

/** All station configs in display order for the picker and the selector. */
export const STATIONS_ORDER: Exclude<StationKey, "all">[] = [
  "pizza",
  "grill",
  "cold",
  "dessert",
  "bar",
  "main",
];

/** Narrow an unknown string to a valid station key (or `all`). */
export function isStationKey(value: string): value is StationKey {
  return (
    value === "all" ||
    value === "main" ||
    value === "pizza" ||
    value === "grill" ||
    value === "cold" ||
    value === "dessert" ||
    value === "bar"
  );
}

export function getStationConfig(key: StationKey): StationConfig {
  if (key === "all") return ALL_STATION_CONFIG;
  return STATIONS_CONFIG[key];
}
