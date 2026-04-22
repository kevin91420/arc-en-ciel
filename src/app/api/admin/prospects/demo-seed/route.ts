/**
 * POST /api/admin/prospects/demo-seed
 *
 * Seed 10 faux restos plausibles autour de Morangis (91420) pour la démo.
 * Utilise createProspect en boucle (dedup via findProspectByNameCity).
 */

import { NextResponse } from "next/server";
import {
  createProspect,
  findProspectByNameCity,
} from "@/lib/db/prospects-client";
import type { CreateProspectPayload } from "@/lib/db/prospects-types";

export const dynamic = "force-dynamic";

const DEMO_CITY = "Morangis";
const DEMO_POSTAL = "91420";

const SEED: Array<Omit<CreateProspectPayload, "city" | "postal_code">> = [
  {
    restaurant_name: "Le Petit Bistrot de Morangis",
    address: "12 Rue de la Gare, 91420 Morangis",
    phone: "01 69 09 12 34",
    email: "contact@petitbistrot-morangis.fr",
    website: "https://petitbistrot-morangis.fr",
    rating: 4.4,
    reviews_count: 187,
    cuisine_type: "Bistrot français",
    price_range: "€€",
  },
  {
    restaurant_name: "Chez Marco Trattoria",
    address: "3 Avenue de la République, 91420 Morangis",
    phone: "01 69 38 22 11",
    email: null,
    website: "https://chez-marco.fr",
    rating: 4.6,
    reviews_count: 412,
    cuisine_type: "Italien",
    price_range: "€€",
  },
  {
    restaurant_name: "La Table du Marché",
    address: "25 Place du Marché, 91420 Morangis",
    phone: "01 69 12 55 80",
    email: "bonjour@tabledumarche-91.fr",
    rating: 4.3,
    reviews_count: 96,
    cuisine_type: "Cuisine de saison",
    price_range: "€€€",
  },
  {
    restaurant_name: "Le Jardin Zen",
    address: "44 Rue du Stade, 91420 Morangis",
    phone: "01 69 44 77 21",
    email: "jardinzen.morangis@gmail.com",
    rating: 4.1,
    reviews_count: 58,
    cuisine_type: "Asiatique",
    price_range: "€",
  },
  {
    restaurant_name: "Brasserie de l'Aéroport",
    address: "2 Avenue Charles de Gaulle, 91420 Morangis",
    phone: "01 69 38 00 88",
    email: null,
    website: "https://brasserie-orly.com",
    rating: 3.9,
    reviews_count: 634,
    cuisine_type: "Brasserie",
    price_range: "€€",
  },
  {
    restaurant_name: "Pizzeria del Sole",
    address: "9 Rue des Écoles, 91420 Morangis",
    phone: "01 69 34 90 12",
    email: "commande@pizzeria-delsole.fr",
    rating: 4.5,
    reviews_count: 221,
    cuisine_type: "Pizzeria",
    price_range: "€",
  },
  {
    restaurant_name: "Aux Saveurs d'Orient",
    address: "18 Boulevard Bizet, 91420 Morangis",
    phone: "01 69 20 44 55",
    email: null,
    rating: 4.7,
    reviews_count: 143,
    cuisine_type: "Oriental",
    price_range: "€€",
  },
  {
    restaurant_name: "Le Comptoir du Chef",
    address: "6 Rue Pasteur, 91420 Morangis",
    phone: "01 69 88 12 09",
    email: "reservation@comptoirduchef.fr",
    website: "https://comptoirduchef.fr",
    rating: 4.8,
    reviews_count: 309,
    cuisine_type: "Gastronomique",
    price_range: "€€€€",
  },
  {
    restaurant_name: "Sushi Morangis",
    address: "31 Rue Victor Hugo, 91420 Morangis",
    phone: "01 69 76 33 44",
    email: "contact@sushi-morangis.fr",
    rating: 4.2,
    reviews_count: 78,
    cuisine_type: "Japonais",
    price_range: "€€",
  },
  {
    restaurant_name: "La Crêperie des Lilas",
    address: "14 Rue des Lilas, 91420 Morangis",
    phone: "01 69 56 21 07",
    email: null,
    rating: 4.0,
    reviews_count: 45,
    cuisine_type: "Crêperie",
    price_range: "€",
  },
];

export async function POST() {
  const imported: string[] = [];
  const skipped: string[] = [];

  for (const entry of SEED) {
    try {
      const existing = await findProspectByNameCity(
        entry.restaurant_name,
        DEMO_CITY
      );
      if (existing) {
        skipped.push(entry.restaurant_name);
        continue;
      }
      await createProspect({
        ...entry,
        city: DEMO_CITY,
        postal_code: DEMO_POSTAL,
        country: "France",
        source: "demo_seed",
      });
      imported.push(entry.restaurant_name);
    } catch {
      // swallow individual errors; return the overall stats
      skipped.push(entry.restaurant_name);
    }
  }

  return NextResponse.json(
    {
      imported: imported.length,
      skipped: skipped.length,
      total: SEED.length,
      city: DEMO_CITY,
      details: { imported, skipped },
    },
    { status: 200 }
  );
}
