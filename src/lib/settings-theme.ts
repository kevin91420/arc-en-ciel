/**
 * SETTINGS THEME — Apply restaurant brand colors as CSS variables.
 *
 * Call this after fetching / saving settings on pages that want the new
 * palette reflected globally (e.g. the admin preview, or the public site
 * once settings are cached client-side).
 */
import type { RestaurantSettings } from "./db/settings-types";

type ThemeInput = Pick<
  RestaurantSettings,
  "color_brand" | "color_accent" | "color_signature"
>;

/** Set CSS custom properties on <html> for the three brand colors. */
export function applyThemeToDocument(settings: ThemeInput): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (settings.color_brand) {
    root.style.setProperty("--color-brand", settings.color_brand);
  }
  if (settings.color_accent) {
    root.style.setProperty("--color-accent", settings.color_accent);
  }
  if (settings.color_signature) {
    root.style.setProperty("--color-signature", settings.color_signature);
  }
}

/** Reset the three brand CSS variables (used on unmount if needed). */
export function resetThemeOnDocument(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty("--color-brand");
  root.style.removeProperty("--color-accent");
  root.style.removeProperty("--color-signature");
}
