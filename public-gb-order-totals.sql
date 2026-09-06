-- PEPMOSA PUBLIC OPEN GROUP BUY TOTALS
-- Safe aggregate-only data for the storefront.
-- No customer names, emails, order IDs, or payment details are exposed.

create or replace function public.get_public_gb_order_totals(
  p_gb_number text
)
returns table(
  product_id text,
  variant_id text,
  total_qty bigint
)
language sql
security definer
set search_path = public
as $$
  select
    oi.product_id,
    oi.variant_id,
    coalesce(sum(oi.qty),0)::bigint as total_qty
  from public.orders o
  join public.order_items oi
    on oi.order_id = o.order_id
  where o.gb_number = p_gb_number
    and upper(coalesce(o.payment_status,'')) not in ('REJECTED','CANCELLED','CANCELED')
  group by oi.product_id, oi.variant_id
  order by oi.product_id, oi.variant_id;
$$;

grant execute on function public.get_public_gb_order_totals(text)
to anon, authenticated;
