import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from "@react-email/components";

/**
 * Base layout used by all emails — ensures consistent brand styling.
 * Couleurs : brown #2C1810, gold #B8922F, cream #FDF8F0, red #C0392B
 */

export function BaseLayout({
  preview,
  children,
  showFooter = true,
}: {
  preview: string;
  children: React.ReactNode;
  showFooter?: boolean;
}) {
  return (
    <Html lang="fr">
      <Head>
        <title>L&apos;Arc en Ciel</title>
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#FDF8F0",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          margin: 0,
          padding: "40px 20px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#FFFDF9",
            maxWidth: "600px",
            margin: "0 auto",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(44, 24, 16, 0.08)",
          }}
        >
          {/* Header with brand */}
          <Section
            style={{
              backgroundColor: "#2C1810",
              padding: "32px 24px",
              textAlign: "center" as const,
            }}
          >
            <Text
              style={{
                color: "#B8922F",
                fontSize: "14px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                margin: "0 0 4px 0",
                fontWeight: 600,
              }}
            >
              L&apos;Arc en Ciel
            </Text>
            <Text
              style={{
                color: "#FDF8F0",
                fontSize: "22px",
                margin: 0,
                fontFamily: "Georgia, 'Playfair Display', serif",
                fontWeight: 600,
              }}
            >
              Pizzeria au feu de bois
            </Text>
          </Section>

          {/* Content */}
          <Section style={{ padding: "36px 32px" }}>{children}</Section>

          {/* Footer */}
          {showFooter && (
            <Section
              style={{
                backgroundColor: "#2C1810",
                padding: "24px",
                textAlign: "center" as const,
              }}
            >
              <Text
                style={{
                  color: "#FDF8F0",
                  fontSize: "14px",
                  margin: "0 0 8px 0",
                  fontWeight: 600,
                }}
              >
                36 Rue de l&apos;Église, 91420 Morangis
              </Text>
              <Text
                style={{
                  color: "#FDF8F0",
                  fontSize: "13px",
                  margin: "0 0 8px 0",
                  opacity: 0.8,
                }}
              >
                <Link
                  href="tel:+33164540030"
                  style={{ color: "#B8922F", textDecoration: "none" }}
                >
                  01 64 54 00 30
                </Link>
                {" · "}
                <Link
                  href="https://arc-en-ciel-theta.vercel.app"
                  style={{ color: "#B8922F", textDecoration: "none" }}
                >
                  arc-en-ciel-theta.vercel.app
                </Link>
              </Text>
              <Text
                style={{
                  color: "#FDF8F0",
                  fontSize: "11px",
                  margin: "16px 0 0 0",
                  opacity: 0.5,
                }}
              >
                Mardi–Samedi 11h30-14h30 / 18h00-22h30 · Dimanche 18h00-22h30
              </Text>
            </Section>
          )}
        </Container>

        {/* Legal */}
        <Text
          style={{
            color: "#5C3D2E",
            fontSize: "11px",
            textAlign: "center" as const,
            margin: "16px auto 0",
            maxWidth: "600px",
            opacity: 0.5,
          }}
        >
          Vous recevez cet email car vous avez interagi avec L&apos;Arc en Ciel.
        </Text>
      </Body>
    </Html>
  );
}

/* ── Reusable atoms ───────────────────────────────────────── */

export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: "#2C1810",
        fontSize: "28px",
        fontWeight: 700,
        lineHeight: 1.2,
        margin: "0 0 16px 0",
        fontFamily: "Georgia, 'Playfair Display', serif",
      }}
    >
      {children}
    </Text>
  );
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: "#5C3D2E",
        fontSize: "15px",
        lineHeight: 1.6,
        margin: "0 0 16px 0",
      }}
    >
      {children}
    </Text>
  );
}

export function Button({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? {
          backgroundColor: "#C0392B",
          color: "#FFFDF9",
        }
      : {
          backgroundColor: "transparent",
          color: "#2C1810",
          border: "2px solid #2C1810",
        };

  return (
    <Link
      href={href}
      style={{
        ...styles,
        display: "inline-block",
        padding: "14px 28px",
        borderRadius: "30px",
        fontSize: "15px",
        fontWeight: 700,
        textDecoration: "none",
        margin: "8px 0",
      }}
    >
      {children}
    </Link>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 16px 8px 0",
          color: "#8B6914",
          fontSize: "12px",
          textTransform: "uppercase" as const,
          letterSpacing: "1px",
          fontWeight: 600,
          width: "140px",
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "8px 0",
          color: "#2C1810",
          fontSize: "15px",
          fontWeight: 500,
        }}
      >
        {value}
      </td>
    </tr>
  );
}

export function Divider() {
  return (
    <Section
      style={{
        height: "1px",
        background: "linear-gradient(to right, transparent, #B8922F40, transparent)",
        margin: "24px 0",
      }}
    />
  );
}
