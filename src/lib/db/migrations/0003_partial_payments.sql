-- ═══════════════════════════════════════════════════════════
-- Migration 0003 — Partial payments (split par items)
-- ═══════════════════════════════════════════════════════════
--
-- Idempotent. Adds the order_payments table that lets a single order be
-- settled in N parts ("Paul prend les 2 pizzas, Jean prend le reste").
--
-- Design notes :
--   - Each row is one payment (cash / card / TR / autre)
--   - `item_ids uuid[]` keeps a soft link to the items covered by that
--     payment — used by the UI to know what's still due. The link is
--     informative ; we never *modify* order_items based on payments.
--   - `amount_cents` is the truth on the money side. Sum across all
--     payments for an order ≥ order.total_cents → order is fully paid.
--   - Triggers : when sum(amount_cents) for an order ≥ order.total_cents,
--     auto-promote orders.status to 'paid' + set paid_at.
-- ═══════════════════════════════════════════════════════════

create table if not exists order_payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  tip_cents int default 0 check (tip_cents >= 0),
  method text not null check (method in ('cash', 'card', 'ticket_resto', 'other')),
  item_ids uuid[] default array[]::uuid[],
  staff_id uuid references staff_members(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

create index if not exists order_payments_order_idx on order_payments(order_id);
create index if not exists order_payments_method_idx on order_payments(method);

-- RLS — service role full access, like the other tables
alter table order_payments enable row level security;
drop policy if exists "Service role full access" on order_payments;
create policy "Service role full access" on order_payments for all using (auth.role() = 'service_role');

-- Realtime — so the addition page refreshes when a server pays a part on a
-- different tablet
alter publication supabase_realtime add table order_payments;

-- ── Auto-finalize the order when fully paid ────────────────
-- A trigger on order_payments fires after every insert/delete and recomputes
-- the total paid. If it covers the order, status flips to 'paid'.
create or replace function auto_finalize_order_payment()
returns trigger as $$
declare
  total_paid int;
  order_total int;
  target_order_id uuid;
begin
  target_order_id := coalesce(new.order_id, old.order_id);
  select coalesce(sum(amount_cents), 0)
    into total_paid
    from order_payments
    where order_id = target_order_id;

  select total_cents
    into order_total
    from orders
    where id = target_order_id;

  if order_total is not null and total_paid >= order_total then
    update orders
      set status = 'paid',
          paid_at = coalesce(paid_at, now()),
          tip_cents = (
            select coalesce(sum(tip_cents), 0)
            from order_payments where order_id = target_order_id
          )
      where id = target_order_id and status <> 'paid';
  else
    -- If a payment was deleted and we no longer cover the total, allow the
    -- order to drop back to its previous service state. We only revert to
    -- 'served' to avoid touching tickets in cuisine — managers can manually
    -- re-fire if absolutely needed.
    if (tg_op = 'DELETE') then
      update orders
        set status = 'served', paid_at = null
        where id = target_order_id and status = 'paid';
    end if;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_auto_finalize_payment_ai on order_payments;
create trigger trg_auto_finalize_payment_ai
  after insert on order_payments
  for each row execute function auto_finalize_order_payment();

drop trigger if exists trg_auto_finalize_payment_ad on order_payments;
create trigger trg_auto_finalize_payment_ad
  after delete on order_payments
  for each row execute function auto_finalize_order_payment();

-- ── Verification ───────────────────────────────────────────
-- select id, order_id, amount_cents, method, array_length(item_ids, 1) from order_payments order by created_at desc limit 5;
