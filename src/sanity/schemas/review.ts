import { defineField, defineType } from "sanity";

export default defineType({
  name: "review",
  title: "⭐ Avis Clients",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Nom du client",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "rating",
      title: "Note (1-5)",
      type: "number",
      validation: (r) => r.required().min(1).max(5),
    }),
    defineField({
      name: "text",
      title: "Témoignage",
      type: "text",
      rows: 3,
      validation: (r) => r.required(),
    }),
    defineField({
      name: "date",
      title: "Date relative (ex: Il y a 2 semaines)",
      type: "string",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "text" },
  },
});
