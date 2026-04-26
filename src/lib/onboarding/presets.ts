/**
 * Onboarding sectoral presets.
 *
 * Each preset is a starter pack of categories + items + sensible feature
 * defaults. The wizard applies one of these so a fresh tenant has a
 * functional menu the moment they finish the setup. The owner edits/refines
 * later from /admin/menu — but they're never staring at an empty screen.
 */

import type { Station } from "@/lib/db/pos-types";
import type { DietaryTag } from "@/lib/db/menu-types";

export type RestaurantType =
  | "pizzeria"
  | "bistro"
  | "fastfood"
  | "bar"
  | "cafe";

export interface PresetCategory {
  id: string;
  number: string;
  title: string;
  subtitle?: string;
  icon: string;
  station: Station;
}

export interface PresetItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  tags?: DietaryTag[];
  signature?: boolean;
  popular?: boolean;
}

export interface PresetFeatures {
  feature_qr_menu: boolean;
  feature_loyalty: boolean;
  feature_reservations: boolean;
  feature_takeaway: boolean;
  feature_delivery: boolean;
  feature_terrace: boolean;
  feature_pmr: boolean;
  feature_halal: boolean;
  feature_runner_tickets: boolean;
  feature_special_flags: boolean;
}

export interface RestaurantPreset {
  id: RestaurantType;
  label: string;
  emoji: string;
  pitch: string;
  features: PresetFeatures;
  categories: PresetCategory[];
  items: PresetItem[];
  /* Recommended station list — feeds the kitchen home page */
  stations: Station[];
}

/* ── Helpers ────────────────────────────────────────────── */
const f = (overrides: Partial<PresetFeatures> = {}): PresetFeatures => ({
  feature_qr_menu: true,
  feature_loyalty: true,
  feature_reservations: true,
  feature_takeaway: true,
  feature_delivery: false,
  feature_terrace: false,
  feature_pmr: true,
  feature_halal: false,
  feature_runner_tickets: false,
  feature_special_flags: true,
  ...overrides,
});

/* ═══════════════════════════════════════════════════════════
   PIZZERIA
   ═══════════════════════════════════════════════════════════ */
const PIZZERIA: RestaurantPreset = {
  id: "pizzeria",
  label: "Pizzeria",
  emoji: "🍕",
  pitch: "Pizzas au four, pâtes, antipasti. QR menu fort, fidélité tampons.",
  stations: ["pizza", "cold", "dessert", "bar"],
  features: f({ feature_loyalty: true, feature_qr_menu: true }),
  categories: [
    { id: "entrees", number: "01", title: "Entrées", subtitle: "Antipasti", icon: "🫒", station: "cold" },
    { id: "pizzas", number: "02", title: "Pizzas", subtitle: "Au feu de bois", icon: "🍕", station: "pizza" },
    { id: "pates", number: "03", title: "Pâtes", subtitle: "Fraîches maison", icon: "🍝", station: "main" },
    { id: "desserts", number: "04", title: "Desserts", subtitle: "Dolci", icon: "🍰", station: "dessert" },
    { id: "boissons", number: "05", title: "Boissons", subtitle: "Bar", icon: "🍷", station: "bar" },
  ],
  items: [
    { id: "bruschetta", category_id: "entrees", name: "Bruschetta", description: "Tomates fraîches, ail, basilic, huile d'olive", price_cents: 750, tags: ["vegetarien"] },
    { id: "burrata", category_id: "entrees", name: "Burrata", description: "Burrata des Pouilles, tomates cerises, roquette", price_cents: 1200, tags: ["vegetarien"], popular: true },
    { id: "marg", category_id: "pizzas", name: "Margherita", description: "Tomate, mozzarella, basilic", price_cents: 1100, tags: ["vegetarien"], popular: true },
    { id: "regina", category_id: "pizzas", name: "Reine", description: "Tomate, mozzarella, jambon, champignons", price_cents: 1300 },
    { id: "diavola", category_id: "pizzas", name: "Diavola", description: "Tomate, mozzarella, salami piquant", price_cents: 1400, tags: ["epice"] },
    { id: "4fromages", category_id: "pizzas", name: "4 Fromages", description: "Mozza, gorgonzola, parmesan, chèvre", price_cents: 1500, tags: ["vegetarien"], signature: true },
    { id: "carbonara", category_id: "pates", name: "Carbonara", description: "Crème, lardons, parmesan, jaune d'œuf", price_cents: 1300, popular: true },
    { id: "bolognese", category_id: "pates", name: "Bolognaise", description: "Sauce tomate, bœuf mijoté", price_cents: 1300 },
    { id: "tiramisu", category_id: "desserts", name: "Tiramisu", description: "Mascarpone, café, cacao", price_cents: 700, signature: true },
    { id: "panna", category_id: "desserts", name: "Panna cotta", description: "Crème vanille, coulis fruits rouges", price_cents: 600 },
    { id: "vin-rouge", category_id: "boissons", name: "Verre de vin rouge", description: "Chianti", price_cents: 500 },
    { id: "coca", category_id: "boissons", name: "Coca-Cola 33cl", description: "", price_cents: 350 },
    { id: "espresso", category_id: "boissons", name: "Espresso", description: "Café italien", price_cents: 250 },
  ],
};

/* ═══════════════════════════════════════════════════════════
   BISTRO
   ═══════════════════════════════════════════════════════════ */
const BISTRO: RestaurantPreset = {
  id: "bistro",
  label: "Bistro / Brasserie",
  emoji: "🥖",
  pitch: "Cuisine française, ardoise du jour, cours classiques.",
  stations: ["main", "grill", "cold", "dessert", "bar"],
  features: f({
    feature_reservations: true,
    feature_runner_tickets: true,
    feature_qr_menu: false,
  }),
  categories: [
    { id: "entrees", number: "01", title: "Entrées", subtitle: "Pour commencer", icon: "🥗", station: "cold" },
    { id: "plats", number: "02", title: "Plats", subtitle: "Le cœur du repas", icon: "🍽", station: "main" },
    { id: "viandes", number: "03", title: "Grillades", subtitle: "Viandes & poissons", icon: "🥩", station: "grill" },
    { id: "fromages", number: "04", title: "Fromages", subtitle: "Plateau du moment", icon: "🧀", station: "cold" },
    { id: "desserts", number: "05", title: "Desserts", subtitle: "Maison", icon: "🍰", station: "dessert" },
    { id: "vins", number: "06", title: "Vins & boissons", subtitle: "Cave de France", icon: "🍷", station: "bar" },
  ],
  items: [
    { id: "soupe", category_id: "entrees", name: "Soupe à l'oignon", description: "Croûton gratiné", price_cents: 850, tags: ["vegetarien"] },
    { id: "oeuf-mayo", category_id: "entrees", name: "Œuf mayonnaise", description: "Classique de bistrot", price_cents: 600 },
    { id: "salade-chevre", category_id: "entrees", name: "Salade de chèvre chaud", description: "Toasts, miel, noix", price_cents: 1200, tags: ["vegetarien"] },
    { id: "blanquette", category_id: "plats", name: "Blanquette de veau", description: "Riz pilaf", price_cents: 1900, popular: true },
    { id: "boeuf-bourguignon", category_id: "plats", name: "Bœuf bourguignon", description: "Pommes vapeur", price_cents: 2100, signature: true },
    { id: "magret", category_id: "viandes", name: "Magret de canard", description: "Sauce miel et orange", price_cents: 2300 },
    { id: "entrecote", category_id: "viandes", name: "Entrecôte 250g", description: "Pommes Pont-Neuf, sauce béarnaise", price_cents: 2500, popular: true },
    { id: "plateau-fromages", category_id: "fromages", name: "Plateau de fromages", description: "5 sélections affineur, pain noisette", price_cents: 1100 },
    { id: "creme-brulee", category_id: "desserts", name: "Crème brûlée", description: "Vanille de Madagascar", price_cents: 750, signature: true },
    { id: "tarte-tatin", category_id: "desserts", name: "Tarte Tatin", description: "Pommes caramélisées, glace vanille", price_cents: 850 },
    { id: "verre-bordeaux", category_id: "vins", name: "Verre de Bordeaux", description: "AOC Saint-Émilion", price_cents: 700 },
    { id: "verre-bourgogne", category_id: "vins", name: "Verre de Bourgogne", description: "AOC Pinot noir", price_cents: 800 },
    { id: "kir", category_id: "vins", name: "Kir royal", description: "Crémant + cassis", price_cents: 750 },
  ],
};

/* ═══════════════════════════════════════════════════════════
   FAST-FOOD / SNACK
   ═══════════════════════════════════════════════════════════ */
const FASTFOOD: RestaurantPreset = {
  id: "fastfood",
  label: "Fast-food / Snack",
  emoji: "🍔",
  pitch: "Burgers, frites, à emporter / livraison. QR menu fort.",
  stations: ["main", "grill", "bar"],
  features: f({
    feature_qr_menu: true,
    feature_takeaway: true,
    feature_delivery: true,
    feature_reservations: false,
    feature_loyalty: true,
  }),
  categories: [
    { id: "burgers", number: "01", title: "Burgers", subtitle: "100% maison", icon: "🍔", station: "grill" },
    { id: "tacos", number: "02", title: "Tacos & wraps", subtitle: "Roulés gourmands", icon: "🌯", station: "main" },
    { id: "frites", number: "03", title: "Frites & sides", subtitle: "Fraîches, pas surgelées", icon: "🍟", station: "main" },
    { id: "desserts", number: "04", title: "Desserts", subtitle: "À emporter", icon: "🍦", station: "dessert" },
    { id: "boissons", number: "05", title: "Boissons", subtitle: "Soft & cocktails", icon: "🥤", station: "bar" },
  ],
  items: [
    { id: "classic-burger", category_id: "burgers", name: "Le Classic", description: "Steak haché, cheddar, salade, tomate, oignon, sauce burger", price_cents: 990, popular: true },
    { id: "double-cheese", category_id: "burgers", name: "Double cheese", description: "2 steaks, 2 tranches cheddar, oignons confits", price_cents: 1290 },
    { id: "veggie-burger", category_id: "burgers", name: "Veggie", description: "Galette de légumes, avocat, salade", price_cents: 1090, tags: ["vegetarien"] },
    { id: "tacos-poulet", category_id: "tacos", name: "Tacos poulet", description: "Poulet pané, frites, fromage fondu", price_cents: 890, tags: ["halal"] },
    { id: "tacos-viande", category_id: "tacos", name: "Tacos viande hachée", description: "Viande hachée, frites, sauce algérienne", price_cents: 990, tags: ["halal", "epice"] },
    { id: "frites-classic", category_id: "frites", name: "Frites maison", description: "Fraîches, pommes Bintje", price_cents: 350 },
    { id: "frites-cheese", category_id: "frites", name: "Cheesy fries", description: "Frites, cheddar fondu, bacon", price_cents: 590 },
    { id: "donuts", category_id: "desserts", name: "Donut Nutella", description: "Glaçage chocolat", price_cents: 350 },
    { id: "milkshake", category_id: "desserts", name: "Milkshake", description: "Vanille / chocolat / fraise", price_cents: 490 },
    { id: "coca", category_id: "boissons", name: "Coca-Cola 33cl", description: "", price_cents: 250 },
    { id: "ice-tea", category_id: "boissons", name: "Ice tea", description: "Pêche", price_cents: 250 },
  ],
};

/* ═══════════════════════════════════════════════════════════
   BAR
   ═══════════════════════════════════════════════════════════ */
const BAR: RestaurantPreset = {
  id: "bar",
  label: "Bar / Pub",
  emoji: "🍸",
  pitch: "Cocktails, vins, bières, planches à partager.",
  stations: ["bar", "cold"],
  features: f({
    feature_reservations: false,
    feature_takeaway: false,
    feature_qr_menu: true,
    feature_loyalty: false,
  }),
  categories: [
    { id: "cocktails", number: "01", title: "Cocktails signature", subtitle: "Création maison", icon: "🍸", station: "bar" },
    { id: "vins", number: "02", title: "Vins", subtitle: "Au verre / bouteille", icon: "🍷", station: "bar" },
    { id: "bieres", number: "03", title: "Bières", subtitle: "Pression & artisanales", icon: "🍺", station: "bar" },
    { id: "softs", number: "04", title: "Softs", subtitle: "Sans alcool", icon: "🥤", station: "bar" },
    { id: "planches", number: "05", title: "À grignoter", subtitle: "Planches & tapas", icon: "🍽", station: "cold" },
  ],
  items: [
    { id: "mojito", category_id: "cocktails", name: "Mojito", description: "Rhum, menthe, citron vert, sucre, eau gazeuse", price_cents: 900 },
    { id: "spritz", category_id: "cocktails", name: "Aperol Spritz", description: "Aperol, prosecco, eau gazeuse", price_cents: 850, popular: true },
    { id: "negroni", category_id: "cocktails", name: "Negroni", description: "Gin, Campari, vermouth rouge", price_cents: 1000, signature: true },
    { id: "verre-rouge", category_id: "vins", name: "Verre de rouge", description: "Sélection sommelier", price_cents: 600 },
    { id: "verre-blanc", category_id: "vins", name: "Verre de blanc", description: "Sélection sommelier", price_cents: 600 },
    { id: "biere-pression", category_id: "bieres", name: "Pinte pression", description: "Blonde 25cl", price_cents: 550 },
    { id: "biere-ipa", category_id: "bieres", name: "IPA artisanale", description: "Brasserie locale, 33cl", price_cents: 700 },
    { id: "perrier", category_id: "softs", name: "Perrier", description: "Eau gazeuse 33cl", price_cents: 350 },
    { id: "diabolo", category_id: "softs", name: "Diabolo", description: "Sirop au choix", price_cents: 400 },
    { id: "planche-charcuterie", category_id: "planches", name: "Planche charcuterie", description: "Saucisson, jambon, terrine", price_cents: 1500 },
    { id: "planche-fromages", category_id: "planches", name: "Planche fromages", description: "5 fromages affineur", price_cents: 1500 },
    { id: "olives", category_id: "planches", name: "Olives marinées", description: "À l'huile et herbes", price_cents: 500, tags: ["vegetarien", "vegan"] },
  ],
};

/* ═══════════════════════════════════════════════════════════
   CAFÉ
   ═══════════════════════════════════════════════════════════ */
const CAFE: RestaurantPreset = {
  id: "cafe",
  label: "Café / Salon de thé",
  emoji: "☕",
  pitch: "Cafés de spécialité, pâtisseries, brunchs.",
  stations: ["bar", "dessert", "main"],
  features: f({
    feature_qr_menu: true,
    feature_loyalty: true,
    feature_reservations: false,
    feature_takeaway: true,
  }),
  categories: [
    { id: "cafes", number: "01", title: "Cafés", subtitle: "Spécialité", icon: "☕", station: "bar" },
    { id: "thes", number: "02", title: "Thés & infusions", subtitle: "En vrac", icon: "🍵", station: "bar" },
    { id: "patisseries", number: "03", title: "Pâtisseries", subtitle: "Maison", icon: "🥐", station: "dessert" },
    { id: "brunch", number: "04", title: "Brunch", subtitle: "Toute la journée", icon: "🍳", station: "main" },
    { id: "boissons", number: "05", title: "Jus & smoothies", subtitle: "Fraîchement pressés", icon: "🥤", station: "bar" },
  ],
  items: [
    { id: "espresso", category_id: "cafes", name: "Espresso", description: "Pure origine éthiopienne", price_cents: 230 },
    { id: "cappuccino", category_id: "cafes", name: "Cappuccino", description: "Mousse de lait fouettée", price_cents: 380, popular: true },
    { id: "flat-white", category_id: "cafes", name: "Flat white", description: "Double ristretto, lait micro-filtré", price_cents: 420, signature: true },
    { id: "latte", category_id: "cafes", name: "Café latte", description: "Doux et crémeux", price_cents: 420 },
    { id: "the-vert", category_id: "thes", name: "Thé vert Sencha", description: "Japon, en feuilles", price_cents: 480 },
    { id: "earl-grey", category_id: "thes", name: "Earl Grey", description: "Bergamote, lait optionnel", price_cents: 480 },
    { id: "croissant", category_id: "patisseries", name: "Croissant beurre", description: "Boulangerie locale", price_cents: 250, tags: ["vegetarien"] },
    { id: "pain-au-choc", category_id: "patisseries", name: "Pain au chocolat", description: "Chocolat Valrhona", price_cents: 280 },
    { id: "cookie", category_id: "patisseries", name: "Cookie maison", description: "Pépites de chocolat", price_cents: 300 },
    { id: "avocado-toast", category_id: "brunch", name: "Avocado toast", description: "Pain au levain, avocat, œuf poché", price_cents: 1100, tags: ["vegetarien"], popular: true },
    { id: "granola", category_id: "brunch", name: "Granola maison", description: "Yaourt grec, miel, fruits frais", price_cents: 850, tags: ["vegetarien"] },
    { id: "jus-orange", category_id: "boissons", name: "Jus d'orange pressé", description: "Oranges fraîches", price_cents: 480 },
    { id: "smoothie", category_id: "boissons", name: "Smoothie du jour", description: "Banane, fruits rouges, lait d'amande", price_cents: 580, tags: ["vegetarien"] },
  ],
};

export const PRESETS: RestaurantPreset[] = [
  PIZZERIA,
  BISTRO,
  FASTFOOD,
  BAR,
  CAFE,
];

export function getPreset(id: RestaurantType): RestaurantPreset | null {
  return PRESETS.find((p) => p.id === id) ?? null;
}
