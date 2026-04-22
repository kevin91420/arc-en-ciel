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
import type { Reservation } from "@/lib/db/types";

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
