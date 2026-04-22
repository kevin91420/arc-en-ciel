import type { Metadata } from "next";
import FidelitePage from "./FidelitePage";

export const metadata: Metadata = {
  title: "Programme Fidélité — L'Arc en Ciel | Pizzeria à Morangis",
  description:
    "Rejoignez le programme de fidélité de L'Arc en Ciel. Une pizza offerte toutes les 5 visites. Inscription gratuite en moins d'une minute.",
  alternates: {
    canonical: "https://arc-en-ciel-theta.vercel.app/fidelite",
  },
  openGraph: {
    title: "Programme Fidélité — L'Arc en Ciel",
    description:
      "Récompensons vos visites. Une pizza offerte toutes les 5 visites.",
    type: "website",
    locale: "fr_FR",
    url: "https://arc-en-ciel-theta.vercel.app/fidelite",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2C1810",
};

export default function Page() {
  return <FidelitePage />;
}
