-- KIT COMPLETION storefront + atomic checkout support
-- Applied to Supabase project on 2026-09-02.

-- Only incomplete variants are returned.
create or replace function public.get_kit_completion_inventory(p_gb_number text)
returns table(variant_id text, ordered_qty integer, remaining_qty integer)
language sql stable security definer set search_path=public
as $$
  with totals as (
    select oi.variant_id, coalesce(sum(oi.qty),0)::integer as ordered_qty
    from public.order_items oi
    join public.orders o on o.order_id=oi.order_id
    where o.gb_number=p_gb_number
      and upper(coalesce(o.payment_status,'')) not in ('REJECTED','CANCELLED','CANCELED')
    group by oi.variant_id
  )
  select variant_id,ordered_qty,(10-(ordered_qty%10))%10 as remaining_qty
  from totals
  where (10-(ordered_qty%10))%10>0;
$$;

-- submit_group_buy_order is the atomic checkout RPC used by checkout-polish.js.
-- It verifies PAID admin fee by email and serializes KIT_COMPLETION checkout
-- so the same remaining vial cannot be sold twice.
