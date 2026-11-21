-- Customer tracking repair: include all ordered products and quantities.
-- Applied to production Supabase project as migration:
-- repair_customer_tracking_order_items

create or replace function public.get_customer_tracking(p_email text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  e text := lower(trim(coalesce(p_email,'')));
begin
  if length(e) < 5 then
    return jsonb_build_object(
      'orders','[]'::jsonb,
      'order_items','[]'::jsonb,
      'shipments','[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'orders',
      coalesce((
        select jsonb_agg(to_jsonb(o) order by o.created_at desc)
        from public.orders o
        where lower(trim(o.email)) = e
      ), '[]'::jsonb),

    'order_items',
      coalesce((
        select jsonb_agg(to_jsonb(oi) order by oi.order_id, oi.product_name, oi.strength)
        from public.order_items oi
        join public.orders o on o.order_id = oi.order_id
        where lower(trim(o.email)) = e
      ), '[]'::jsonb),

    'shipments',
      coalesce((
        select jsonb_agg(to_jsonb(s) order by s.updated_at desc nulls last, s.created_at desc)
        from public.consolidated_shipments s
        where lower(trim(s.email)) = e
      ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_customer_tracking(text) from public;
grant execute on function public.get_customer_tracking(text) to anon, authenticated;
