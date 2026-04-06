import { defineField, defineType } from "sanity";

export default defineType({
  name: "service",
  title: "🚚 Services",
  type: "document",
  fields: [
    defineField({
      name: "icon",
      title: "Icône",
      type: "string",
      options: {
        list: [
          { title: "🚚 Livraison", value: "truck" },
          { title: "🛍️ À emporter", value: "bag" },
          { title: "☀️ Terrasse", value: "sun" },
          { title: "👥 Événements", value: "users" },
          { title: "👨‍🍳 Traiteur", value: "chef" },
          { title: "♿ PMR", value: "accessible" },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "label",
      title: "Nom du service",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "desc",
      title: "Description",
      type: "string",
    }),
    defineField({
      name: "order",
      title: "Ordre",
      type: "number",
      initialValue: 0,
    }),
  ],
  orderings: [
    { title: "Ordre", name: "order", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: {
    select: { title: "label", subtitle: "desc" },
  },
});
