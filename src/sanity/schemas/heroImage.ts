import { defineField, defineType } from "sanity";

export default defineType({
  name: "heroImage",
  title: "🖼️ Images Hero (Carousel)",
  type: "document",
  fields: [
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "alt",
      title: "Description de l'image",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "order",
      title: "Ordre d'affichage",
      type: "number",
      initialValue: 0,
    }),
  ],
  orderings: [
    { title: "Ordre", name: "order", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: {
    select: { title: "alt", media: "image" },
  },
});
