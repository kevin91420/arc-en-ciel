import { defineField, defineType } from "sanity";

export default defineType({
  name: "siteSettings",
  title: "⚙️ Paramètres du Restaurant",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Nom du restaurant",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "tagline",
      title: "Slogan",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "phone",
      title: "Téléphone",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
    }),
    defineField({
      name: "address",
      title: "Adresse",
      type: "string",
    }),
    defineField({
      name: "mapsLink",
      title: "Lien Google Maps",
      type: "url",
    }),
    defineField({
      name: "menuPdf",
      title: "URL du menu PDF",
      type: "url",
    }),
    defineField({
      name: "hours",
      title: "Horaires d'ouverture",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "days", title: "Jours", type: "string" },
            { name: "time", title: "Horaires", type: "string" },
          ],
          preview: {
            select: { title: "days", subtitle: "time" },
          },
        },
      ],
    }),
    defineField({
      name: "payment",
      title: "Moyens de paiement",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "facebookUrl",
      title: "Facebook",
      type: "url",
    }),
    defineField({
      name: "instagramUrl",
      title: "Instagram",
      type: "url",
    }),
    defineField({
      name: "googleUrl",
      title: "Google (avis)",
      type: "url",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Paramètres du Restaurant" }),
  },
});
