/**
 * Menu helpers for the POS — adapts `src/data/carte.ts` (which is authored as
 * display data with FR price strings) into the POS shape (integer cents +
 * kitchen station). Kept inside /staff/_lib so the underscore prefix keeps
 * this folder out of Next's route tree.
 */

import type { MenuCategory, MenuItem } from "@/data/carte";
import type { Station } from "@/lib/db/pos-types";
import { parsePriceToCents } from "@/lib/format";

/** Map a CARTE category id to the KDS station that prepares it. */
export function stationForCategory(categoryId: string): Station {
  switch (categoryId) {
    case "pizzas":
      return "pizza";
    case "grillades":
      return "grill";
    case "entrees":
    case "salades":
      return "cold";
    case "desserts":
      return "dessert";
    case "boissons":
      return "bar";
    case "pates":
    default:
      return "main";
  }
}

export interface PosMenuItem {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  price_label: string;
  station: Station;
  category_id: string;
  category_title: string;
  signature?: boolean;
  popular?: boolean;
  chef?: boolean;
  tags?: MenuItem["tags"];
}

export interface PosMenuCategory {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  icon: string;
  station: Station;
  items: PosMenuItem[];
}

/**
 * Convert the editorial CARTE into the POS-flavoured shape (cents + station).
 * Pure + memoisable — safe to call at module load.
 */
export function toPosCatalog(carte: MenuCategory[]): PosMenuCategory[] {
  return carte.map((cat) => {
    const station = stationForCategory(cat.id);
    return {
      id: cat.id,
      number: cat.number,
      title: cat.title,
      subtitle: cat.subtitle,
      icon: cat.icon,
      station,
      items: cat.items.map((it) => ({
        id: it.id,
        name: it.name,
        description: it.description,
        price_cents: parsePriceToCents(it.price),
        price_label: it.price,
        station,
        category_id: cat.id,
        category_title: cat.title,
        signature: it.signature,
        popular: it.popular,
        chef: it.chef,
        tags: it.tags,
      })),
    };
  });
}
