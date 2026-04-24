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

type PageProps = {
  params: Promise<{ station: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { station } = await params;
  if (!isStationKey(station)) {
    return { title: "Cuisine · L'Arc en Ciel" };
  }
  const cfg = getStationConfig(station);
  return {
    title: `KDS · ${cfg.label} · L'Arc en Ciel`,
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
