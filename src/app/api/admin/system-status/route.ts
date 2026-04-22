/**
 * GET /api/admin/system-status — État du système (intégrations + stats globales)
 */
import { NextResponse } from "next/server";
import { getEmailConfig } from "@/lib/email/client";
import { listReservations, listCustomers } from "@/lib/db/client";
import { listAllCards } from "@/lib/db/loyalty-client";
import { getPosOverviewStats } from "@/lib/db/pos-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const emailCfg = getEmailConfig();
  const webhookConfigured = Boolean(process.env.WEBHOOK_SECRET);

  let reservationsCount = 0;
  let customersCount = 0;
  let loyaltyCardsCount = 0;
  let totalStamps = 0;
  let rewardsClaimed = 0;
  let totalOrdersToday = 0;
  let revenueTodayCents = 0;
  let activeOrders = 0;

  try {
    const [reservations, customers, cards, pos] = await Promise.all([
      listReservations().catch(() => []),
      listCustomers().catch(() => []),
      listAllCards().catch(() => []),
      getPosOverviewStats().catch(() => ({
        total_orders_today: 0,
        revenue_today_cents: 0,
        active_orders: 0,
      })),
    ]);
    reservationsCount = reservations.length;
    customersCount = customers.length;
    loyaltyCardsCount = cards.length;
    totalStamps = cards.reduce((s, c) => s + c.total_stamps_earned, 0);
    rewardsClaimed = cards.reduce((s, c) => s + c.rewards_claimed, 0);
    totalOrdersToday = pos.total_orders_today;
    revenueTodayCents = pos.revenue_today_cents;
    activeOrders = pos.active_orders;
  } catch {
    /* Silent fallback to zeros */
  }

  return NextResponse.json({
    integrations: {
      supabase: {
        enabled: supabaseConfigured,
        label: "Supabase",
        description: "Base de données persistante (résas, clients, fidélité)",
        setupUrl:
          "https://arc-en-ciel-theta.vercel.app/admin/parametres#supabase",
      },
      email: {
        enabled: emailCfg.configured,
        label: "Resend",
        description: "Emails transactionnels (confirmations, fidélité)",
        setupUrl: "https://resend.com",
        from: emailCfg.from,
        admin: emailCfg.admin,
      },
      webhook: {
        enabled: webhookConfigured,
        label: "Webhooks",
        description: "TheFork, Google Reserve, Deliveroo, etc.",
        setupUrl:
          "https://arc-en-ciel-theta.vercel.app/admin/integrations",
      },
    },
    stats: {
      total_reservations: reservationsCount,
      total_customers: customersCount,
      total_loyalty_cards: loyaltyCardsCount,
      total_stamps: totalStamps,
      total_rewards_claimed: rewardsClaimed,
      total_orders_today: totalOrdersToday,
      revenue_today_cents: revenueTodayCents,
      active_orders: activeOrders,
    },
    restaurant: {
      name: "L'Arc en Ciel",
      phone: "01 64 54 00 30",
      address: "36 Rue de l'Église, 91420 Morangis",
      email: "larcencielmorangis@gmail.com",
    },
  });
}
