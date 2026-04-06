import { defineField, defineType } from "sanity";

export default defineType({
  name: "pizza",
  title: "🍕 Pizzas",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Nom",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name" },
    }),
    defineField({
      name: "ingredients",
      title: "Ingrédients",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "price",
      title: "Prix (ex: 9,50 €)",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      title: "Catégorie",
      type: "string",
      options: {
        list: [
          { title: "Classiques", value: "classiques" },
          { title: "Spéciales", value: "speciales" },
          { title: "Végétariennes", value: "vegetariennes" },
        ],
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "image",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "badge",
      title: "Badge (ex: Chef, Premium, Veggie)",
      type: "string",
    }),
    defineField({
      name: "featured",
      title: "Pizza Signature (mise en avant)",
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
    select: { title: "name", subtitle: "price", media: "image" },
  },
});
