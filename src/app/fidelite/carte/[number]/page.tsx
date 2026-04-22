import type { Metadata } from "next";
import CardPage from "./CardPage";

export const metadata: Metadata = {
  title: "Ma carte fidélité — L'Arc en Ciel",
  description:
    "Votre carte de fidélité L'Arc en Ciel. Présentez-la à chaque visite pour obtenir un tampon.",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "L'Arc en Ciel",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
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

export default async function Page({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  return <CardPage cardNumber={number} />;
}
