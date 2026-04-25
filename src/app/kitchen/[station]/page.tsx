/**
 * /kitchen/[station] — KDS locked to a single cooking station.
 *
 * Server component. Validates the slug against the known station set,
 * 404s otherwise (no way to accidentally land on an "all" view by typo).
 *
 * `all` is a valid slug — it is the chef-principal view (no filtering).
 *
 * In Next.js 16, `params` is a Promise and must be awaited.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import KitchenBoard from "../_lib/KitchenBoard";
import { getStationConfig, isStationKey } from "../_lib/stations";
import { getSettings } from "@/lib/db/settings-client";

type PageProps = {
  params: Promise<{ station: string }>;
};

async function getBrandName(): Promise<string> {
  try {
    const s = await getSettings();
    return s.name?.trim() || "Cuisine";
  } catch {
    return "Cuisine";
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const [{ station }, brand] = await Promise.all([params, getBrandName()]);
  if (!isStationKey(station)) {
    return { title: `Cuisine · ${brand}`, robots: { index: false, follow: false } };
  }
  const cfg = getStationConfig(station);
  return {
    title: `KDS · ${cfg.label} · ${brand}`,
    robots: { index: false, follow: false },
  };
}

export default async function KitchenStationPage({ params }: PageProps) {
  const { station } = await params;
  if (!isStationKey(station)) {
    notFound();
  }
  return <KitchenBoard station={station} />;
}
