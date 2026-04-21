import type { Metadata } from "next";
import QRGeneratorPage from "./QRGeneratorPage";

export const metadata: Metadata = {
  title: "Générateur QR — L'Arc en Ciel",
  description: "Générez les QR codes des tables pour accéder au menu mobile.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <QRGeneratorPage />;
}
