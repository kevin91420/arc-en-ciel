import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "L'Arc en Ciel — Pizzeria Morangis",
    short_name: "Arc en Ciel",
    description: "Pizzas au feu de bois & grillades à Morangis",
    start_url: "/",
    display: "standalone",
    background_color: "#FDF8F0",
    theme_color: "#C0392B",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
