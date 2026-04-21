import type { Metadata } from "next";
import MobileMenuPage from "./MobileMenuPage";

export const metadata: Metadata = {
  title: "Menu — L'Arc en Ciel",
  description:
    "Consultez la carte de L'Arc en Ciel directement depuis votre table.",
  robots: { index: false, follow: false }, // QR only, pas SEO
  alternates: { canonical: "https://arc-en-ciel-theta.vercel.app/m/carte" },
  other: {
    "format-detection": "telephone=no",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2C1810",
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  return <MobileMenuPage searchParamsPromise={searchParams} />;
}
