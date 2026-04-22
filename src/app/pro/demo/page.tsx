import type { Metadata } from "next";
import DemoPage from "./DemoPage";

export const metadata: Metadata = {
  title: "Voir GOURMET PACK en action — 90 secondes",
  description:
    "Du client qui réserve jusqu'à l'encaissement, voyez le pack complet en action dans un restaurant réel.",
  openGraph: {
    title: "Voir GOURMET PACK en action — 90 secondes",
    description:
      "Du client qui réserve jusqu'à l'encaissement, voyez le pack complet en action dans un restaurant réel.",
    type: "website",
    locale: "fr_FR",
    url: "https://arc-en-ciel-theta.vercel.app/pro/demo",
    siteName: "GOURMET PACK",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Démo GOURMET PACK — Un service complet en 90 secondes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Voir GOURMET PACK en action — 90 secondes",
    description:
      "Du client qui réserve jusqu'à l'encaissement, voyez le pack complet en action.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "https://arc-en-ciel-theta.vercel.app/pro/demo",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Page() {
  return <DemoPage />;
}
