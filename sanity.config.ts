import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "@/sanity/schemas";
import { projectId, dataset } from "@/sanity/env";

export default defineConfig({
  name: "arc-en-ciel",
  title: "L'Arc en Ciel — Admin",
  projectId,
  dataset,
  basePath: "/studio",
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Contenu")
          .items([
            // Settings singleton
            S.listItem()
              .title("⚙️ Paramètres du Restaurant")
              .child(
                S.document()
                  .schemaType("siteSettings")
                  .documentId("siteSettings")
                  .title("Paramètres du Restaurant")
              ),
            S.divider(),
            // Regular lists
            S.documentTypeListItem("pizza").title("🍕 Pizzas"),
            S.documentTypeListItem("review").title("⭐ Avis Clients"),
            S.documentTypeListItem("heroImage").title("🖼️ Images Hero"),
            S.documentTypeListItem("galleryImage").title("📸 Galerie Photos"),
            S.documentTypeListItem("service").title("🚚 Services"),
          ]),
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
});
