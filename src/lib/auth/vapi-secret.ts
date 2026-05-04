/**
 * VAPI WEBHOOK SECRET — vérification que les calls aux tools Vapi viennent
 * bien de Vapi.ai et pas d'un attaquant random.
 *
 * Vapi signe ses webhooks avec un header `x-vapi-signature` (HMAC SHA-256).
 * On vérifie cette signature avec un secret partagé.
 *
 * Le secret est stocké dans VAPI_WEBHOOK_SECRET côté env Vercel.
 * Si non configuré, on tombe en mode "open" (uniquement pour dev) avec un
 * warning console.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const VAPI_SECRET = process.env.VAPI_WEBHOOK_SECRET;

/**
 * Vérifie qu'une requête entrante vient bien de Vapi.
 * Retourne true si OK, false sinon. En dev (secret non configuré),
 * retourne true mais log un warning.
 */
export async function verifyVapiSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  if (!VAPI_SECRET) {
    /* eslint-disable-next-line no-console */
    console.warn(
      "[vapi] VAPI_WEBHOOK_SECRET non configuré — webhook accepté sans vérif (DEV ONLY)"
    );
    return true;
  }
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", VAPI_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");

  /* timingSafeEqual nécessite des Buffer de même taille */
  const sigBuf = Buffer.from(signatureHeader, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

/**
 * Wrapper pour les routes : extrait le tenant_slug depuis le body Vapi
 * (passé en metadata par l'assistant) et le résout.
 *
 * Vapi peut passer du contexte arbitraire dans metadata.tenant_slug —
 * c'est comme ça qu'on identifie quel resto le call concerne.
 */
export function extractTenantSlugFromVapiPayload(
  payload: Record<string, unknown>
): string | null {
  const meta = (payload as { call?: { metadata?: Record<string, unknown> } })
    .call?.metadata;
  if (meta && typeof meta.tenant_slug === "string") {
    return meta.tenant_slug;
  }
  /* Fallback : top-level metadata */
  const top = (payload as { metadata?: Record<string, unknown> }).metadata;
  if (top && typeof top.tenant_slug === "string") {
    return top.tenant_slug;
  }
  return null;
}
