/**
 * EMAIL CLIENT — Wrapper Resend avec graceful degradation.
 *
 * Si RESEND_API_KEY n'est pas configurée, toutes les fonctions d'envoi
 * loguent silencieusement et retournent `{ skipped: true }`. L'app continue
 * à tourner sans emails.
 *
 * En prod : configurer RESEND_API_KEY + EMAIL_FROM dans les env vars.
 */

import { Resend } from "resend";
import type { ReactElement } from "react";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM || "L'Arc en Ciel <no-reply@arc-en-ciel.app>";
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "larcencielmorangis@gmail.com";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string };

interface SendEmailParams {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  if (!resend) {
    console.warn(
      `[email] Skipped — RESEND_API_KEY not configured. Would have sent "${params.subject}" to ${params.to}`
    );
    return { ok: false, skipped: true, reason: "RESEND_API_KEY missing" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      react: params.react,
      replyTo: params.replyTo,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: error.message || "Unknown Resend error" };
    }

    return { ok: true, id: data?.id || "unknown" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown send error";
    console.error("[email] Exception:", msg);
    return { ok: false, error: msg };
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

export function getEmailConfig() {
  return {
    configured: Boolean(RESEND_API_KEY),
    from: EMAIL_FROM,
    admin: ADMIN_EMAIL,
  };
}

export function getAdminEmail(): string {
  return ADMIN_EMAIL;
}
