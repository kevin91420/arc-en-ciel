/**
 * LOYALTY CLIENT — Fonctions DB pour le programme de fidélité
 * Fonctionne en mode Supabase (prod) ou Memory (démo)
 */

import type {
  LoyaltyCard,
  LoyaltyCardFull,
  LoyaltyTransaction,
  LoyaltyConfig,
  LoyaltyStats,
  EnrollLoyaltyPayload,
} from "./loyalty-types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

async function sb<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!USE_SUPABASE) throw new Error("Supabase not configured");
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY!}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/* ── Memory store fallback ─────────────────────────────── */
type LoyaltyStore = {
  cards: Map<string, LoyaltyCard>;
  transactions: Map<string, LoyaltyTransaction>;
  config: LoyaltyConfig;
};
const globalStore = globalThis as unknown as { __loyaltyStore?: LoyaltyStore };
function getMemStore(): LoyaltyStore {
  if (!globalStore.__loyaltyStore) {
    globalStore.__loyaltyStore = {
      cards: new Map(),
      transactions: new Map(),
      config: {
        id: 1,
        stamps_required: 5,
        reward_label: "Une pizza au choix offerte",
        reward_description:
          "Valable sur toute la carte des pizzas, hors spéciales.",
        welcome_message:
          "Bienvenue dans le programme fidélité de L'Arc en Ciel !",
        brand_color: "#2C1810",
        accent_color: "#B8922F",
        active: true,
        updated_at: new Date().toISOString(),
      },
    };
  }
  return globalStore.__loyaltyStore;
}

/* ── Card number generator (short, readable) ───────────── */
export function generateCardNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ACE-${code}`;
}

/* ═══════════════════════════════════════════════════════════
   ENROLL — Création ou récupération d'une carte
   ═══════════════════════════════════════════════════════════ */

export async function enrollCustomer(
  payload: EnrollLoyaltyPayload
): Promise<LoyaltyCard> {
  if (!USE_SUPABASE) return enrollMemory(payload);

  /* 1. Find or create customer */
  let customerId: string | null = null;

  if (payload.customer_email) {
    const found = await sb<Array<{ id: string }>>(
      `customers?select=id&email=eq.${encodeURIComponent(payload.customer_email)}&limit=1`
    );
    if (found.length > 0) customerId = found[0].id;
  }
  if (!customerId && payload.customer_phone) {
    const normalizedPhone = payload.customer_phone.replace(/\s/g, "");
    const found = await sb<Array<{ id: string }>>(
      `customers?select=id&phone=eq.${encodeURIComponent(normalizedPhone)}&limit=1`
    );
    if (found.length > 0) customerId = found[0].id;
  }

  if (!customerId) {
    const [created] = await sb<Array<{ id: string }>>(`customers`, {
      method: "POST",
      body: JSON.stringify({
        name: payload.customer_name,
        email: payload.customer_email || null,
        phone: payload.customer_phone?.replace(/\s/g, "") || null,
      }),
    });
    customerId = created.id;
  }

  /* 2. Check if this customer already has a card */
  const existingCards = await sb<LoyaltyCard[]>(
    `loyalty_cards?select=*&customer_id=eq.${customerId}&limit=1`
  );
  if (existingCards.length > 0) return existingCards[0];

  /* 3. Generate unique card number (retry a few times if collision) */
  let cardNumber = generateCardNumber();
  for (let i = 0; i < 5; i++) {
    const collision = await sb<Array<{ id: string }>>(
      `loyalty_cards?select=id&card_number=eq.${encodeURIComponent(cardNumber)}&limit=1`
    );
    if (collision.length === 0) break;
    cardNumber = generateCardNumber();
  }

  /* 4. Create card */
  const [card] = await sb<LoyaltyCard[]>(`loyalty_cards`, {
    method: "POST",
    body: JSON.stringify({
      customer_id: customerId,
      card_number: cardNumber,
      current_stamps: 0,
      total_stamps_earned: 0,
    }),
  });

  /* 5. Log enrollment transaction */
  await sb(`loyalty_transactions`, {
    method: "POST",
    body: JSON.stringify({
      card_id: card.id,
      type: "enrollment",
      amount: 0,
      note: "Inscription au programme fidélité",
    }),
  });

  return card;
}

function enrollMemory(payload: EnrollLoyaltyPayload): LoyaltyCard {
  const store = getMemStore();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const card: LoyaltyCard = {
    id,
    customer_id: crypto.randomUUID(),
    card_number: generateCardNumber(),
    current_stamps: 0,
    total_stamps_earned: 0,
    rewards_claimed: 0,
    last_stamp_at: null,
    enrolled_at: now,
    created_at: now,
    updated_at: now,
  };
  store.cards.set(id, card);
  return card;
}

/* ═══════════════════════════════════════════════════════════
   GET CARD — Lecture publique par card_number
   ═══════════════════════════════════════════════════════════ */

export async function getCardByNumber(
  cardNumber: string
): Promise<LoyaltyCardFull | null> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    const card = [...store.cards.values()].find(
      (c) => c.card_number === cardNumber
    );
    return card ? { ...card, customer_name: "Client Démo" } : null;
  }

  const cards = await sb<LoyaltyCard[]>(
    `loyalty_cards?select=*&card_number=eq.${encodeURIComponent(cardNumber)}&limit=1`
  );
  if (cards.length === 0) return null;
  const card = cards[0];

  /* Fetch customer */
  const customers = await sb<
    Array<{ name: string; email: string | null; phone: string | null }>
  >(`customers?select=name,email,phone&id=eq.${card.customer_id}&limit=1`);

  /* Fetch recent transactions */
  const transactions = await sb<LoyaltyTransaction[]>(
    `loyalty_transactions?select=*&card_id=eq.${card.id}&order=created_at.desc&limit=20`
  );

  return {
    ...card,
    customer_name: customers[0]?.name,
    customer_email: customers[0]?.email,
    customer_phone: customers[0]?.phone,
    transactions,
  };
}

/* ═══════════════════════════════════════════════════════════
   ADD STAMP — Staff scan QR → +1 tampon
   ═══════════════════════════════════════════════════════════ */

export async function addStamp(
  cardNumber: string,
  staffMember?: string
): Promise<{
  card: LoyaltyCard;
  rewardEarned: boolean;
  stampsAdded: number;
  stampsRequired: number;
}> {
  const config = await getConfig();

  if (!USE_SUPABASE) {
    const store = getMemStore();
    const card = [...store.cards.values()].find(
      (c) => c.card_number === cardNumber
    );
    if (!card) throw new Error("Card not found");
    card.current_stamps += 1;
    card.total_stamps_earned += 1;
    card.last_stamp_at = new Date().toISOString();
    const rewardEarned = card.current_stamps >= config.stamps_required;
    if (rewardEarned) {
      card.current_stamps = 0;
      card.rewards_claimed += 1;
    }
    return {
      card,
      rewardEarned,
      stampsAdded: 1,
      stampsRequired: config.stamps_required,
    };
  }

  const cards = await sb<LoyaltyCard[]>(
    `loyalty_cards?select=*&card_number=eq.${encodeURIComponent(cardNumber)}&limit=1`
  );
  if (cards.length === 0) throw new Error("Card not found");
  const card = cards[0];

  const newStamps = card.current_stamps + 1;
  const rewardEarned = newStamps >= config.stamps_required;
  const updates = rewardEarned
    ? {
        current_stamps: 0,
        total_stamps_earned: card.total_stamps_earned + 1,
        rewards_claimed: card.rewards_claimed + 1,
        last_stamp_at: new Date().toISOString(),
      }
    : {
        current_stamps: newStamps,
        total_stamps_earned: card.total_stamps_earned + 1,
        last_stamp_at: new Date().toISOString(),
      };

  const [updated] = await sb<LoyaltyCard[]>(
    `loyalty_cards?id=eq.${card.id}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    }
  );

  /* Log transactions — separate inserts because PostgREST requires
     all objects in a batch to have identical key sets. */
  await sb(`loyalty_transactions`, {
    method: "POST",
    body: JSON.stringify({
      card_id: card.id,
      type: "stamp_earned",
      amount: 1,
      note: null,
      staff_member: staffMember || "staff",
    }),
  });
  if (rewardEarned) {
    await sb(`loyalty_transactions`, {
      method: "POST",
      body: JSON.stringify({
        card_id: card.id,
        type: "reward_claimed",
        amount: config.stamps_required,
        note: config.reward_label,
        staff_member: staffMember || "staff",
      }),
    });
  }

  return {
    card: updated,
    rewardEarned,
    stampsAdded: 1,
    stampsRequired: config.stamps_required,
  };
}

/* ═══════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════ */

export async function getConfig(): Promise<LoyaltyConfig> {
  if (!USE_SUPABASE) return getMemStore().config;
  const rows = await sb<LoyaltyConfig[]>(`loyalty_config?select=*&id=eq.1&limit=1`);
  if (rows.length === 0) {
    /* Shouldn't happen — SQL inserts default row. Fallback: */
    return {
      id: 1,
      stamps_required: 5,
      reward_label: "Une pizza offerte",
      reward_description: "",
      welcome_message: "Bienvenue !",
      brand_color: "#2C1810",
      accent_color: "#B8922F",
      active: true,
      updated_at: new Date().toISOString(),
    };
  }
  return rows[0];
}

export async function updateConfig(
  updates: Partial<LoyaltyConfig>
): Promise<LoyaltyConfig> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    store.config = { ...store.config, ...updates, updated_at: new Date().toISOString() };
    return store.config;
  }
  const [row] = await sb<LoyaltyConfig[]>(`loyalty_config?id=eq.1`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return row;
}

/* ═══════════════════════════════════════════════════════════
   LIST / STATS
   ═══════════════════════════════════════════════════════════ */

export async function listAllCards(): Promise<LoyaltyCardFull[]> {
  if (!USE_SUPABASE) {
    return [...getMemStore().cards.values()].map((c) => ({ ...c }));
  }

  const cards = await sb<LoyaltyCard[]>(
    `loyalty_cards?select=*&order=last_stamp_at.desc.nullslast,enrolled_at.desc`
  );
  if (cards.length === 0) return [];

  const customerIds = [...new Set(cards.map((c) => c.customer_id))];
  const customers = await sb<
    Array<{ id: string; name: string; email: string | null; phone: string | null }>
  >(
    `customers?select=id,name,email,phone&id=in.(${customerIds.map((id) => `"${id}"`).join(",")})`
  );
  const byId = new Map(customers.map((c) => [c.id, c]));

  return cards.map((card) => {
    const c = byId.get(card.customer_id);
    return {
      ...card,
      customer_name: c?.name || "—",
      customer_email: c?.email,
      customer_phone: c?.phone,
    };
  });
}

export async function getLoyaltyStats(): Promise<LoyaltyStats> {
  const cards = await listAllCards();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);

  const activeCards = cards.filter(
    (c) => c.last_stamp_at && new Date(c.last_stamp_at) >= ninetyDaysAgo
  );

  const totalStampsGiven = cards.reduce(
    (sum, c) => sum + c.total_stamps_earned,
    0
  );
  const totalRewards = cards.reduce(
    (sum, c) => sum + c.rewards_claimed,
    0
  );

  const topCustomers = [...cards]
    .sort((a, b) => b.total_stamps_earned - a.total_stamps_earned)
    .slice(0, 5)
    .map((c) => ({
      card_number: c.card_number,
      customer_name: c.customer_name || "—",
      total_stamps: c.total_stamps_earned,
    }));

  return {
    total_cards: cards.length,
    active_cards: activeCards.length,
    total_stamps_given: totalStampsGiven,
    total_rewards_claimed: totalRewards,
    avg_stamps_per_card:
      cards.length > 0 ? totalStampsGiven / cards.length : 0,
    top_customers: topCustomers,
  };
}

export function isDemoMode() {
  return !USE_SUPABASE;
}
