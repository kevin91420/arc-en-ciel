/**
 * EMAIL DISPATCHERS — High-level functions qui envoient les templates
 * Utilisées dans les API routes. Non-blocking (fire-and-forget).
 */

import { createElement } from "react";
import { sendEmail, getAdminEmail } from "./client";
import ReservationConfirmation from "@/emails/ReservationConfirmation";
import AdminReservationAlert from "@/emails/AdminReservationAlert";
import LoyaltyEnrollment from "@/emails/LoyaltyEnrollment";
import RewardUnlocked from "@/emails/RewardUnlocked";
import LeadReceivedAdmin from "@/emails/LeadReceivedAdmin";
import LeadAcknowledgment from "@/emails/LeadAcknowledgment";
import ProspectIntro from "@/emails/ProspectIntro";
import ProspectFollowup1 from "@/emails/ProspectFollowup1";
import ProspectFollowup2 from "@/emails/ProspectFollowup2";
import ProspectLastChance from "@/emails/ProspectLastChance";
import type { Reservation } from "@/lib/db/types";
import type { PackLead } from "@/lib/db/leads-types";
import type {
  Prospect,
  ProspectTemplateId,
} from "@/lib/db/prospects-types";

/**
 * Envoyé dès qu'une réservation est créée (via site, webhook, ou admin).
 * 2 emails : un au client, un au resto.
 */
export async function sendReservationEmails(r: Reservation) {
  const tasks: Promise<unknown>[] = [];

  /* Client email (if we have their address) */
  if (r.customer_email) {
    tasks.push(
      sendEmail({
        to: r.customer_email,
        subject: `Votre réservation du ${formatDate(r.date)} — L'Arc en Ciel`,
        react: createElement(ReservationConfirmation, {
          customerName: r.customer_name,
          date: r.date,
          time: r.time,
          guests: r.guests,
          reservationId: r.id,
          specialOccasion: r.special_occasion,
          notes: r.notes,
        }),
      })
    );
  }

  /* Admin email — always fires */
  tasks.push(
    sendEmail({
      to: getAdminEmail(),
      subject: `🔔 Nouvelle résa : ${r.customer_name} (${r.guests}p, ${formatDate(r.date)})`,
      react: createElement(AdminReservationAlert, {
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        customerEmail: r.customer_email,
        date: r.date,
        time: r.time,
        guests: r.guests,
        source: r.source,
        notes: r.notes,
        specialOccasion: r.special_occasion,
      }),
      replyTo: r.customer_email || undefined,
    })
  );

  return Promise.allSettled(tasks);
}

/**
 * Envoyé après inscription au programme fidélité.
 */
export async function sendLoyaltyEnrollmentEmail(params: {
  customerEmail?: string | null;
  customerName: string;
  cardNumber: string;
  stampsRequired: number;
  rewardLabel: string;
}) {
  if (!params.customerEmail) return { skipped: true, reason: "no email" };
  return sendEmail({
    to: params.customerEmail,
    subject: `🎁 Votre carte fidélité ${params.cardNumber} — L'Arc en Ciel`,
    react: createElement(LoyaltyEnrollment, {
      customerName: params.customerName,
      cardNumber: params.cardNumber,
      stampsRequired: params.stampsRequired,
      rewardLabel: params.rewardLabel,
    }),
  });
}

/**
 * Envoyé quand une récompense est débloquée (5e tampon).
 */
export async function sendRewardUnlockedEmail(params: {
  customerEmail?: string | null;
  customerName: string;
  cardNumber: string;
  rewardLabel: string;
  rewardDescription?: string;
  totalVisits: number;
}) {
  if (!params.customerEmail) return { skipped: true, reason: "no email" };
  return sendEmail({
    to: params.customerEmail,
    subject: `🎉 Bravo ! Votre récompense est débloquée — L'Arc en Ciel`,
    react: createElement(RewardUnlocked, {
      customerName: params.customerName,
      cardNumber: params.cardNumber,
      rewardLabel: params.rewardLabel,
      rewardDescription: params.rewardDescription,
      totalVisits: params.totalVisits,
    }),
  });
}

/**
 * Envoyé dès qu'un lead est créé via le landing /pro.
 * 2 emails : alerte admin (Kevin) + accusé de réception au prospect.
 * Fire-and-forget via Promise.allSettled.
 */
export async function sendLeadEmails(lead: PackLead) {
  const tasks: Promise<unknown>[] = [];

  /* Admin alert — always fires */
  tasks.push(
    sendEmail({
      to: getAdminEmail(),
      subject: `🎯 Nouveau lead : ${lead.restaurant_name}`,
      react: createElement(LeadReceivedAdmin, {
        restaurantName: lead.restaurant_name,
        contactName: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        interest: lead.interest,
      }),
      replyTo: lead.email,
    })
  );

  /* Prospect acknowledgment */
  tasks.push(
    sendEmail({
      to: lead.email,
      subject: "Merci pour votre intérêt — GOURMET PACK",
      react: createElement(LeadAcknowledgment, {
        contactName: lead.contact_name,
        restaurantName: lead.restaurant_name,
      }),
    })
  );

  return Promise.allSettled(tasks);
}

/* ═══════════════════════════════════════════════════════════
   OUTBOUND PROSPECTION — Cold outreach sequence
   ═══════════════════════════════════════════════════════════ */

const PROSPECT_REPLY_TO = "kaubouin@gmail.com";

type ProspectEmailPayload = {
  subject: string;
  html: string; // rendered HTML body for logging
  result:
    | { ok: true; id: string }
    | { ok: false; error: string; skipped?: boolean };
};

/**
 * Renvoie le sujet d'email correspondant à un template, personnalisé
 * avec le nom du resto.
 */
export function prospectSubject(
  templateId: ProspectTemplateId,
  restaurantName: string
): string {
  switch (templateId) {
    case "intro":
      return `Une idée pour ${restaurantName}`;
    case "follow_up_1":
      return `${restaurantName} — un chiffre qui change tout`;
    case "follow_up_2":
      return `${restaurantName} — la démo tient en 30 secondes`;
    case "last_chance":
      return `Je vous retire de ma liste — ${restaurantName}`;
  }
}

/**
 * Construit l'élément React correspondant au template.
 */
function prospectReactElement(
  templateId: ProspectTemplateId,
  prospect: Prospect
) {
  const props = {
    restaurantName: prospect.restaurant_name,
    city: prospect.city || null,
    contactName: null,
  };
  switch (templateId) {
    case "intro":
      return createElement(ProspectIntro, props);
    case "follow_up_1":
      return createElement(ProspectFollowup1, props);
    case "follow_up_2":
      return createElement(ProspectFollowup2, props);
    case "last_chance":
      return createElement(ProspectLastChance, props);
  }
}

/**
 * Envoie un email de prospection et retourne le résultat détaillé.
 * L'appelant (route API) se charge de logger dans prospect_emails
 * et de mettre à jour le statut du prospect.
 */
export async function sendProspectEmail(
  prospect: Prospect,
  templateId: ProspectTemplateId
): Promise<ProspectEmailPayload> {
  if (!prospect.email) {
    return {
      subject: "",
      html: "",
      result: { ok: false, error: "Prospect has no email" },
    };
  }

  const subject = prospectSubject(templateId, prospect.restaurant_name);
  const element = prospectReactElement(templateId, prospect);

  const result = await sendEmail({
    to: prospect.email,
    subject,
    react: element,
    replyTo: PROSPECT_REPLY_TO,
  });

  // Body rendu pour logging (simpliste — on stocke juste le template_id + subject
  // comme référence ; Resend renvoie un id et stocke l'HTML de son côté).
  const html = `template:${templateId}`;

  if (result.ok) {
    return { subject, html, result: { ok: true, id: result.id } };
  }
  if ("skipped" in result && result.skipped) {
    return {
      subject,
      html,
      result: { ok: false, error: result.reason, skipped: true },
    };
  }
  return {
    subject,
    html,
    result: {
      ok: false,
      error: "error" in result ? result.error : "Unknown send error",
    },
  };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}
