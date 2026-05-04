/**
 * LOYALTY CLIENT — Programme de fidélité scoped par tenant.
 *
 * Sprint 7b Phase F : toutes les fonctions filtrent automatiquement par
 * `restaurant_id` du tenant courant. Cards, customers, config et
 * transactions sont isolés par tenant.
 */

import type {
  BirthdayCustomer,
  LoyaltyCard,
  LoyaltyCardFull,
  LoyaltyTransaction,
  LoyaltyConfig,
  LoyaltyStats,
  EnrollLoyaltyPayload,
} from "./loyalty-types";
import { getCurrentTenantId } from "./tenant";

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

async function resolveTenantId(explicit?: string): Promise<string> {
  return explicit ?? (await getCurrentTenantId());
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
   ENROLL — Création ou récupération d'une carte (tenant-scoped)
   ═══════════════════════════════════════════════════════════ */

export async function enrollCustomer(
  payload: EnrollLoyaltyPayload,
  tenantId?: string
): Promise<LoyaltyCard> {
  if (!USE_SUPABASE) return enrollMemory(payload);

  const restaurantId = await resolveTenantId(tenantId);
  const tenantFilter = `&restaurant_id=eq.${encodeURIComponent(restaurantId)}`;

  /* 1. Find or create customer (par tenant — un même email peut exister
   * dans plusieurs tenants sans collision) */
  let customerId: string | null = null;

  if (payload.customer_email) {
    const found = await sb<Array<{ id: string }>>(
      `customers?select=id&email=eq.${encodeURIComponent(payload.customer_email)}${tenantFilter}&limit=1`
    );
    if (found.length > 0) customerId = found[0].id;
  }
  if (!customerId && payload.customer_phone) {
    const normalizedPhone = payload.customer_phone.replace(/\s/g, "");
    const found = await sb<Array<{ id: string }>>(
      `customers?select=id&phone=eq.${encodeURIComponent(normalizedPhone)}${tenantFilter}&limit=1`
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
        birthday: payload.customer_birthday || null,
        birthday_consent: Boolean(payload.birthday_consent),
        marketing_consent: Boolean(payload.marketing_consent),
        sms_consent: Boolean(payload.sms_consent),
        restaurant_id: restaurantId,
      }),
    });
    customerId = created.id;
  } else if (
    payload.customer_birthday ||
    payload.birthday_consent !== undefined ||
    payload.marketing_consent !== undefined ||
    payload.sms_consent !== undefined
  ) {
    /* Customer existant — on met à jour les champs anniversaire/consentements
     * uniquement si le payload les fournit (l'utilisateur peut compléter
     * son profil au fil de l'eau). */
    const patch: Record<string, unknown> = {};
    if (payload.customer_birthday) patch.birthday = payload.customer_birthday;
    if (payload.birthday_consent !== undefined)
      patch.birthday_consent = Boolean(payload.birthday_consent);
    if (payload.marketing_consent !== undefined)
      patch.marketing_consent = Boolean(payload.marketing_consent);
    if (payload.sms_consent !== undefined)
      patch.sms_consent = Boolean(payload.sms_consent);
    if (Object.keys(patch).length > 0) {
      await sb(
        `customers?id=eq.${customerId}${tenantFilter}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
        }
      ).catch(() => null);
    }
  }

  /* 2. Check if this customer already has a card (dans CE tenant) */
  const existingCards = await sb<LoyaltyCard[]>(
    `loyalty_cards?select=*&customer_id=eq.${customerId}${tenantFilter}&limit=1`
  );
  if (existingCards.length > 0) return existingCards[0];

  /* 3. Generate unique card number (retry a few times if collision dans CE tenant) */
  let cardNumber = generateCardNumber();
  for (let i = 0; i < 5; i++) {
    const collision = await sb<Array<{ id: string }>>(
      `loyalty_cards?select=id&card_number=eq.${encodeURIComponent(cardNumber)}${tenantFilter}&limit=1`
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
      restaurant_id: restaurantId,
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
      restaurant_id: restaurantId,
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
  /* On utilise le payload pour rester cohérent avec l'API même si memory store ne scope pas par champ */
  void payload;
  store.cards.set(id, card);
  return card;
}

/* ═══════════════════════════════════════════════════════════
   GET CARD — Lecture publique par card_number (tenant-scoped)
   ═══════════════════════════════════════════════════════════ */

export async function getCardByNumber(
  cardNumber: string,
  tenantId?: string
): Promise<LoyaltyCardFull | null> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    const card = [...store.cards.values()].find(
      (c) => c.card_number === cardNumber
    );
    return card ? { ...card, customer_name: "Client Démo" } : null;
  }

  const restaurantId = await resolveTenantId(tenantId);
  const tenantFilter = `&restaurant_id=eq.${encodeURIComponent(restaurantId)}`;

  const cards = await sb<LoyaltyCard[]>(
    `loyalty_cards?select=*&card_number=eq.${encodeURIComponent(cardNumber)}${tenantFilter}&limit=1`
  );
  if (cards.length === 0) return null;
  const card = cards[0];

  /* Fetch customer (filtré par tenant aussi) */
  const customers = await sb<
    Array<{ name: string; email: string | null; phone: string | null }>
  >(
    `customers?select=name,email,phone&id=eq.${card.customer_id}${tenantFilter}&limit=1`
  );

  /* Fetch recent transactions */
  const transactions = await sb<LoyaltyTransaction[]>(
    `loyalty_transactions?select=*&card_id=eq.${card.id}${tenantFilter}&order=created_at.desc&limit=20`
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
   ADD STAMP — Staff scan QR → +1 tampon (tenant-scoped)
   ═══════════════════════════════════════════════════════════ */

export async function addStamp(
  cardNumber: string,
  staffMember?: string,
  tenantId?: string
): Promise<{
  card: LoyaltyCard;
  rewardEarned: boolean;
  stampsAdded: number;
  stampsRequired: number;
}> {
  const restaurantId = await resolveTenantId(tenantId);
  const config = await getConfig(restaurantId);

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

  const tenantFilter = `&restaurant_id=eq.${encodeURIComponent(restaurantId)}`;

  const cards = await sb<LoyaltyCard[]>(
    `loyalty_cards?select=*&card_number=eq.${encodeURIComponent(cardNumber)}${tenantFilter}&limit=1`
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
    `loyalty_cards?id=eq.${card.id}${tenantFilter}`,
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
      restaurant_id: restaurantId,
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
        restaurant_id: restaurantId,
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
   CONFIG (par tenant — UPSERT pattern)
   ═══════════════════════════════════════════════════════════ */

export async function getConfig(tenantId?: string): Promise<LoyaltyConfig> {
  if (!USE_SUPABASE) return getMemStore().config;
  const restaurantId = await resolveTenantId(tenantId);

  const rows = await sb<LoyaltyConfig[]>(
    `loyalty_config?select=*&restaurant_id=eq.${encodeURIComponent(restaurantId)}&limit=1`
  );
  if (rows.length === 0) {
    /* Pas de config pour ce tenant : on retourne un default sans la créer.
     * Elle sera auto-créée à la 1ère écriture via updateConfig. */
    return {
      id: 1,
      stamps_required: 5,
      reward_label: "Une boisson offerte",
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
  updates: Partial<LoyaltyConfig>,
  tenantId?: string
): Promise<LoyaltyConfig> {
  if (!USE_SUPABASE) {
    const store = getMemStore();
    store.config = {
      ...store.config,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return store.config;
  }

  const restaurantId = await resolveTenantId(tenantId);

  /* Try UPDATE first */
  const updated = await sb<LoyaltyConfig[]>(
    `loyalty_config?restaurant_id=eq.${encodeURIComponent(restaurantId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    }
  );
  if (updated.length > 0) return updated[0];

  /* Fallback INSERT */
  const seed = {
    stamps_required: 5,
    reward_label: "Une boisson offerte",
    reward_description: "",
    welcome_message: "Bienvenue !",
    brand_color: "#2C1810",
    accent_color: "#B8922F",
    active: true,
    ...updates,
    restaurant_id: restaurantId,
  };
  const [inserted] = await sb<LoyaltyConfig[]>(`loyalty_config`, {
    method: "POST",
    body: JSON.stringify(seed),
  });
  return inserted;
}

/* ═══════════════════════════════════════════════════════════
   LIST / STATS (tenant-scoped)
   ═══════════════════════════════════════════════════════════ */

export async function listAllCards(
  tenantId?: string
): Promise<LoyaltyCardFull[]> {
  if (!USE_SUPABASE) {
    return [...getMemStore().cards.values()].map((c) => ({ ...c }));
  }

  const restaurantId = await resolveTenantId(tenantId);
  const tenantFilter = `&restaurant_id=eq.${encodeURIComponent(restaurantId)}`;

  const cards = await sb<LoyaltyCard[]>(
    `loyalty_cards?select=*${tenantFilter}&order=last_stamp_at.desc.nullslast,enrolled_at.desc`
  );
  if (cards.length === 0) return [];

  const customerIds = [...new Set(cards.map((c) => c.customer_id))];
  const customers = await sb<
    Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    }>
  >(
    `customers?select=id,name,email,phone&id=in.(${customerIds.map((id) => `"${id}"`).join(",")})${tenantFilter}`
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

export async function getLoyaltyStats(tenantId?: string): Promise<LoyaltyStats> {
  const cards = await listAllCards(tenantId);
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

/* ═══════════════════════════════════════════════════════════
   BIRTHDAYS — Sprint 7b QW#7
   ═══════════════════════════════════════════════════════════ */

interface CustomerWithBirthday {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birthday: string;
  birthday_consent: boolean;
  marketing_consent: boolean;
  sms_consent: boolean;
  visits_count: number;
  total_spent_cents: number;
}

/**
 * Liste les clients qui ont leur anniversaire dans le mois donné (1-12).
 * Ne renvoie QUE les clients ayant donné `birthday_consent = true` (RGPD).
 *
 * Pour chaque client : indique l'âge qu'ils vont avoir, et s'ils ont une
 * carte de fidélité active (utile pour personnaliser le message).
 */
export async function listBirthdaysForMonth(
  month: number,
  tenantId?: string
): Promise<BirthdayCustomer[]> {
  if (!USE_SUPABASE) return [];
  if (month < 1 || month > 12) {
    throw new Error(`Mois invalide : ${month} (attendu 1-12)`);
  }

  const restaurantId = await resolveTenantId(tenantId);
  const tenantFilter = `&restaurant_id=eq.${encodeURIComponent(restaurantId)}`;

  /* PostgREST n'a pas de fonction extract() exposée directement, donc on
   * fait un range simple "BETWEEN 'XXXX-MM-01' AND 'XXXX-MM-31'" pour
   * chaque année possible — pratiquement on filtre côté JS car la table
   * customers reste limitée. À refactor en RPC si > 10k customers. */
  const customers = await sb<CustomerWithBirthday[]>(
    `customers?select=id,name,email,phone,birthday,birthday_consent,marketing_consent,sms_consent,visits_count,total_spent_cents&birthday=not.is.null&birthday_consent=eq.true${tenantFilter}`
  );

  const today = new Date();
  const currentYear = today.getFullYear();

  /* Charge les cards pour savoir qui est enrolled */
  const cards = await sb<Array<{ customer_id: string; card_number: string }>>(
    `loyalty_cards?select=customer_id,card_number${tenantFilter}`
  );
  const cardByCustomer = new Map(cards.map((c) => [c.customer_id, c]));

  const results: BirthdayCustomer[] = [];
  for (const c of customers) {
    if (!c.birthday) continue;
    const [yearStr, monthStr, dayStr] = c.birthday.split("-");
    const birthYear = parseInt(yearStr, 10);
    const birthMonth = parseInt(monthStr, 10);
    const birthDay = parseInt(dayStr, 10);
    if (birthMonth !== month) continue;

    const card = cardByCustomer.get(c.id);
    const ageTurning =
      Number.isFinite(birthYear) && birthYear > 1900
        ? currentYear - birthYear
        : null;

    results.push({
      customer_id: c.id,
      customer_name: c.name,
      customer_email: c.email,
      customer_phone: c.phone,
      birthday: c.birthday,
      birthday_day: birthDay,
      birthday_month: birthMonth,
      age_turning: ageTurning,
      has_active_card: Boolean(card),
      card_number: card?.card_number ?? null,
      marketing_consent: Boolean(c.marketing_consent),
      sms_consent: Boolean(c.sms_consent),
      total_visits: c.visits_count ?? 0,
      total_spent_cents: c.total_spent_cents ?? 0,
    });
  }

  /* Tri par jour du mois pour affichage chronologique */
  results.sort((a, b) => a.birthday_day - b.birthday_day);
  return results;
}

export function isDemoMode() {
  return !USE_SUPABASE;
}
