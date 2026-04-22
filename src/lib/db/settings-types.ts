/**
 * RESTAURANT SETTINGS — White-label configuration types
 */

export interface OpeningHour {
  days: string;
  time: string;
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

  // Financial
  tax_rate: number;

  // Legal
  legal_name?: string | null;
  siret?: string | null;
  vat_number?: string | null;

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
  tax_rate: 10,
  legal_name: null,
  siret: null,
  vat_number: null,
  updated_at: new Date().toISOString(),
};
