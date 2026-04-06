import { defineField, defineType } from "sanity";

export default defineType({
  name: "galleryImage",
  title: "📸 Galerie Photos",
  type: "document",
  fields: [
    defineField({
      name: "image",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "alt",
      title: "Description",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "tall",
      title: "Image haute (format portrait)",
      type: "boolean",
      initialValue: false,
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
