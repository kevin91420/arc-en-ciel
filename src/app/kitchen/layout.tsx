import type { Metadata } from "next";
import { getSettings } from "@/lib/db/settings-client";

/**
 * /kitchen — KDS (Kitchen Display System).
 *
 * Bare layout: the KDS renders fullscreen on a TV or tablet landscape and
 * must NOT inherit the admin/staff chrome. This wrapper only sets the
 * dark body background and the tab title.
 */

export async function generateMetadata(): Promise<Metadata> {
  let brand = "Cuisine";
  try {
    const s = await getSettings();
    brand = s.name?.trim() || brand;
  } catch {}
  return {
    title: `KDS Cuisine · ${brand}`,
    robots: { index: false, follow: false },
  };
}

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#1a0f0a] text-cream">{children}</div>;
}
