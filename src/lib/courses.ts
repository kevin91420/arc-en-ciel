/**
 * Course = service sequence (entrée → plat → dessert → boissons).
 *
 * The POS derives a course from the item's `menu_item_category`. This avoids a
 * schema migration: every existing order_item already carries its category, so
 * we can group / fire by course without touching the DB.
 *
 * White-label friendly: restaurants that don't use classic French service can
 * still fire by course — everything falls back to "plat" when the mapping is
 * unknown.
 */

export const COURSES = ["entree", "plat", "dessert", "boisson"] as const;
export type Course = (typeof COURSES)[number];

export const COURSE_LABELS: Record<Course, string> = {
  entree: "Entrées",
  plat: "Plats",
  dessert: "Desserts",
  boisson: "Boissons",
};

export const COURSE_ICONS: Record<Course, string> = {
  entree: "🫒",
  plat: "🍽",
  dessert: "🍰",
  boisson: "🍷",
};

export function courseForCategory(categoryId: string | null | undefined): Course {
  switch ((categoryId || "").toLowerCase()) {
    case "entrees":
    case "entree":
    case "antipasti":
    case "salades":
    case "salade":
      return "entree";
    case "desserts":
    case "dessert":
    case "gelati":
      return "dessert";
    case "boissons":
    case "boisson":
    case "drinks":
    case "cocktails":
      return "boisson";
    default:
      return "plat";
  }
}
