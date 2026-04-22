import { Section, Text } from "@react-email/components";
import {
  BaseLayout,
  Heading,
  Paragraph,
  Button,
  InfoRow,
} from "./BaseLayout";

interface Props {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  date: string;
  time: string;
  guests: number;
  source: string;
  notes?: string | null;
  specialOccasion?: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  website: "Site internet",
  phone: "Téléphone",
  google: "Google Reserve",
  thefork: "TheFork",
  walk_in: "Passage",
  other: "Autre",
};

export default function AdminReservationAlert({
  customerName,
  customerPhone,
  customerEmail,
  date,
  time,
  guests,
  source,
  notes,
  specialOccasion,
}: Props) {
  const formattedTime = time.replace(":", "h").replace(/:\d+$/, "");
  const formattedDate = new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <BaseLayout
      preview={`Nouvelle résa : ${customerName} — ${formattedDate} ${formattedTime} (${guests} couverts)`}
    >
      <div
        style={{
          display: "inline-block",
          backgroundColor: "#C0392B",
          color: "#FFFDF9",
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          marginBottom: "12px",
        }}
      >
        🔔 Nouvelle réservation
      </div>

      <Heading>
        {customerName} — {guests} couvert{guests > 1 ? "s" : ""}
      </Heading>

      <Paragraph>
        Une nouvelle réservation vient d&apos;être enregistrée depuis{" "}
        <strong>{SOURCE_LABELS[source] || source}</strong>.
      </Paragraph>

      <Section
        style={{
          backgroundColor: "#FDF8F0",
          padding: "20px 24px",
          borderRadius: "12px",
          border: "2px solid #B8922F",
          margin: "24px 0",
        }}
      >
        <table width="100%" cellPadding="0" cellSpacing="0">
          <tbody>
            <InfoRow label="Date" value={formattedDate} />
            <InfoRow label="Heure" value={formattedTime} />
            <InfoRow
              label="Couverts"
              value={`${guests} personne${guests > 1 ? "s" : ""}`}
            />
            <InfoRow label="Client" value={customerName} />
            <InfoRow label="Téléphone" value={customerPhone} />
            {customerEmail && <InfoRow label="Email" value={customerEmail} />}
            {specialOccasion && (
              <InfoRow label="Occasion" value={specialOccasion} />
            )}
            {notes && <InfoRow label="Remarques" value={notes} />}
          </tbody>
        </table>
      </Section>

      <div style={{ textAlign: "center" as const, margin: "16px 0" }}>
        <Button href="https://arc-en-ciel-theta.vercel.app/admin/reservations">
          Ouvrir dans le CRM →
        </Button>
      </div>

      <Text
        style={{
          color: "#8B6914",
          fontSize: "12px",
          textAlign: "center" as const,
          margin: "24px 0 0 0",
        }}
      >
        Rappel : confirmer le client par téléphone sous 2h.
      </Text>
    </BaseLayout>
  );
}
