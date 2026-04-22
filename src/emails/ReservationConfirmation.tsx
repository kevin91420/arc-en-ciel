import { Section, Text } from "@react-email/components";
import {
  BaseLayout,
  Heading,
  Paragraph,
  Button,
  InfoRow,
  Divider,
} from "./BaseLayout";

interface Props {
  customerName: string;
  date: string;
  time: string;
  guests: number;
  reservationId: string;
  specialOccasion?: string | null;
  notes?: string | null;
}

function formatFrenchDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ReservationConfirmation({
  customerName,
  date,
  time,
  guests,
  reservationId,
  specialOccasion,
  notes,
}: Props) {
  const formattedDate = formatFrenchDate(date);
  const formattedTime = time.replace(":", "h").replace(/:\d+$/, "");

  return (
    <BaseLayout
      preview={`Votre réservation du ${formattedDate} à ${formattedTime} est bien reçue.`}
    >
      <Heading>Votre réservation est bien reçue 🍕</Heading>

      <Paragraph>
        Bonjour <strong>{customerName}</strong>,
      </Paragraph>

      <Paragraph>
        Merci d&apos;avoir choisi <strong>L&apos;Arc en Ciel</strong>. Nous avons
        bien enregistré votre demande de réservation. Un membre de notre équipe
        la confirmera par téléphone sous 2h.
      </Paragraph>

      <Section
        style={{
          backgroundColor: "#FDF8F0",
          padding: "20px 24px",
          borderRadius: "12px",
          border: "1px solid #C4956A33",
          margin: "24px 0",
        }}
      >
        <Text
          style={{
            color: "#8B6914",
            fontSize: "11px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            fontWeight: 700,
            margin: "0 0 12px 0",
          }}
        >
          Détails de la réservation
        </Text>

        <table width="100%" cellPadding="0" cellSpacing="0">
          <tbody>
            <InfoRow label="Date" value={formattedDate} />
            <InfoRow label="Heure" value={formattedTime} />
            <InfoRow
              label="Couverts"
              value={`${guests} personne${guests > 1 ? "s" : ""}`}
            />
            {specialOccasion && (
              <InfoRow label="Occasion" value={specialOccasion} />
            )}
            {notes && <InfoRow label="Remarques" value={notes} />}
            <InfoRow
              label="Référence"
              value={reservationId.substring(0, 8).toUpperCase()}
            />
          </tbody>
        </table>
      </Section>

      <Paragraph>
        Pour modifier ou annuler votre réservation, appelez-nous directement au{" "}
        <strong>01 64 54 00 30</strong>.
      </Paragraph>

      <Divider />

      <Paragraph>
        <strong>💡 Saviez-vous ?</strong> Nous proposons un programme de
        fidélité : à chaque visite, gagnez un tampon. À la 5<sup>e</sup>, une
        pizza est offerte.
      </Paragraph>

      <div style={{ textAlign: "center" as const, margin: "24px 0" }}>
        <Button href="https://arc-en-ciel-theta.vercel.app/fidelite">
          Rejoindre le programme fidélité →
        </Button>
      </div>

      <Paragraph>À très bientôt,</Paragraph>
      <Paragraph>
        <strong>L&apos;équipe de L&apos;Arc en Ciel</strong>
      </Paragraph>
    </BaseLayout>
  );
}
