import type { Metadata } from "next";
import ProPage from "./ProPage";

export const metadata: Metadata = {
  title: "GOURMET PACK — La stack technologique qui digitalise votre restaurant",
  description:
    "Site vitrine, CRM, fidélité, menu QR, emails automatiques. Tout en un, sans abonnement mensuel. Démo live en 10 secondes.",
  keywords:
    "stack restaurant, CRM restaurant, menu QR, fidélité restaurant, site web restaurateur, TheFork alternative, Zelty alternative, digitalisation restaurant",
  openGraph: {
    title: "GOURMET PACK — La stack pour restaurants indépendants",
    description:
      "Site, CRM unifié, menu QR, programme fidélité, emails. Un seul prix, vous êtes propriétaire. Démo live.",
    type: "website",
    locale: "fr_FR",
    url: "https://arc-en-ciel-theta.vercel.app/pro",
    siteName: "GOURMET PACK",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "GOURMET PACK — La stack technologique des restaurants indépendants",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GOURMET PACK — La stack des restaurants indépendants",
    description:
      "Site, CRM, menu QR, fidélité, emails. Un seul pack. Zéro abonnement.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "https://arc-en-ciel-theta.vercel.app/pro",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return <ProPage />;
}
