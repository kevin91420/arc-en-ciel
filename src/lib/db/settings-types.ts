/**
 * RESTAURANT SETTINGS — White-label configuration types
 */

export interface OpeningHour {
  days: string;
  time: string;
}

/**
 * Table configuration — white-label friendly.
 * `number` is the stable DB reference (int, used in orders.table_number).
 * `label` is the free-text name displayed to staff ("T1", "Terrasse 2", "Bar").
 * `zone` lets operators group tables by area (Salle, Terrasse, Étage, Bar…).
 *
 * Geometry fields (Sprint 6) — when provided, the floor plan switches to a
 * 2D canvas view. Coordinates are abstract grid units (1 unit ≈ 40 px) so the
 * same layout looks fine on tablet and desktop.
 */
export type TableShape = "round" | "square" | "rect";

export interface TableConfig {
  number: number;
  label: string;
  capacity: number;
  zone?: string | null;
  /* 2D plan coords. Optional — falls back to grid if any are missing. */
  x?: number;
  y?: number;
  width?: number;   // grid units, default depends on shape
  height?: number;  // grid units
  shape?: TableShape;
  rotation?: number; // degrees, default 0
}

export interface RestaurantSettings {
  id: number;

  // Brand
  name: string;
  tagline?: string | null;
  description?: string | null;
  logo_url?: string | null;

  // Contact
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;

  // Hours
  hours: OpeningHour[];

  // Socials
  facebook_url?: string | null;
  instagram_url?: string | null;
  google_maps_url?: string | null;
  tripadvisor_url?: string | null;

  // Visual theme
  color_brand: string;
  color_accent: string;
  color_signature: string;

  // Menus
  menu_pdf_url?: string | null;
  menu_emporter_pdf_url?: string | null;
  menu_desserts_pdf_url?: string | null;

  // Payment
  payment_methods: string[];

  // Features
  feature_reservations: boolean;
  feature_qr_menu: boolean;
  feature_loyalty: boolean;
  feature_delivery: boolean;
  feature_takeaway: boolean;
  feature_terrace: boolean;
  feature_pmr: boolean;
  feature_halal: boolean;

  // Service flow (Sprint 4) — opt-in chrome
  feature_runner_tickets: boolean; // auto-print runner ticket when item ready
  feature_special_flags: boolean;  // expose Rush/Allergie/Anniv/VIP toggles

  // Setup wizard flag (Sprint 6) — false on a brand new tenant → /onboarding
  setup_completed?: boolean;

  // Active card (Sprint 6b) — pointe vers menu_cards.id ; toutes les
  // surfaces consument cette valeur pour filtrer les catégories.
  active_card_id?: string;

  // Tables (floor plan — white-label: any count, any name)
  tables: TableConfig[];

  // 86 list — menu_item_ids temporarily unavailable (live stock propagation)
  eighty_six_list: string[];

  // Financial
  tax_rate: number;

  // Legal — identité société pour mentions légales, URSSAF, factures
  legal_name?: string | null;          // Raison sociale (ex "SARL L'Arc en Ciel")
  legal_form?: string | null;          // Forme juridique (SARL, SAS, EURL, AE, etc.)
  siret?: string | null;               // SIRET — 14 chiffres (établissement)
  vat_number?: string | null;          // N° TVA intra (FR + 11 chiffres)
  naf_code?: string | null;            // Code NAF/APE (ex 5610A pour resto trad)
  capital_social?: string | null;      // Capital social (texte libre — "10 000 €")
  rcs?: string | null;                 // RCS (ex "RCS Évry B 123 456 789")
  cgv_url?: string | null;             // URL des CGV publiques

  updated_at: string;
}

export type UpdateSettingsPayload = Partial<
  Omit<RestaurantSettings, "id" | "updated_at">
>;

/* Default fallback values */
export const DEFAULT_SETTINGS: RestaurantSettings = {
  id: 1,
  name: "L'Arc en Ciel",
  tagline: "Pizzeria Méditerranéenne",
  description:
    "Pizzas au feu de bois, grillades halal, pâtes fraîches à Morangis.",
  logo_url: null,
  phone: "01 64 54 00 30",
  email: "larcencielmorangis@gmail.com",
  address: "36 Rue de l'Église",
  postal_code: "91420",
  city: "Morangis",
  country: "France",
  latitude: 48.7056,
  longitude: 2.3387,
  hours: [
    { days: "Mardi – Samedi", time: "11h30 – 14h30 · 18h30 – 22h30" },
    { days: "Dimanche", time: "18h00 – 22h30" },
    { days: "Lundi", time: "Fermé" },
  ],
  facebook_url: "https://facebook.com/larcencielmorangis",
  instagram_url: "https://instagram.com/larcencielmorangis",
  google_maps_url: "https://goo.gl/maps/QXyJHS1RNQMmkRJ37",
  tripadvisor_url: null,
  color_brand: "#2C1810",
  color_accent: "#B8922F",
  color_signature: "#C0392B",
  menu_pdf_url:
    "https://cdn.website.dish.co/media/82/5b/9435796/MENU-SUR-PLACE.pdf",
  menu_emporter_pdf_url:
    "https://cdn.website.dish.co/media/5f/40/9568511/MENU-A-EMPORTER.pdf",
  menu_desserts_pdf_url:
    "https://cdn.website.dish.co/media/6f/d2/9435808/CARTE-DES-DESSERTS.pdf",
  payment_methods: [
    "Espèces",
    "Carte bancaire",
    "Ticket Restaurant",
    "Apple Pay",
    "Chèques Vacances",
  ],
  feature_reservations: true,
  feature_qr_menu: true,
  feature_loyalty: true,
  feature_delivery: true,
  feature_takeaway: true,
  feature_terrace: true,
  feature_pmr: true,
  feature_halal: true,
  feature_runner_tickets: false,
  feature_special_flags: true,
  setup_completed: false,
  active_card_id: "default",
  tables: Array.from({ length: 10 }, (_, i) => ({
    number: i + 1,
    label: `T${i + 1}`,
    capacity: 4,
    zone: "Salle",
  })),
  eighty_six_list: [],
  tax_rate: 10,
  legal_name: null,
  legal_form: null,
  siret: null,
  vat_number: null,
  naf_code: null,
  capital_social: null,
  rcs: null,
  cgv_url: null,
  updated_at: new Date().toISOString(),
};
