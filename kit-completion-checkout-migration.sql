-- PEPMOSA KIT COMPLETION — checkout inventory fix
-- Applied to Supabase on 2026-09-02.
--
-- Single source of truth: public.kit_inventory.
-- Storefront reads remaining_qty from this table and checkout locks + decrements
-- the exact variant row inside the submit_group_buy_order transaction.

create or replace function public.get_kit_completion_inventory(p_gb_number text)
returns table(variant_id text, ordered_qty integer, remaining_qty integer)
language sql
stable
security definer
set search_path=public
as $$
  select
    ki.variant_id,
    greatest(0, ki.kit_size - ki.remaining_qty)::integer as ordered_qty,
    ki.remaining_qty::integer as remaining_qty
  from public.kit_inventory ki
  where ki.gb_number = p_gb_number
    and ki.remaining_qty > 0
  order by ki.variant_id;
$$;

-- One-time reconciliation for orders submitted after the inventory snapshot.
-- This fixes the already-submitted checkout that happened before the decrement
-- logic was connected to kit_inventory.
with later_orders as (
  select
    ki.gb_number,
    ki.variant_id,
    coalesce(sum(oi.qty) filter (
      where upper(coalesce(o.payment_status,'')) not in ('REJECTED','CANCELLED','CANCELED')
    ),0)::integer as qty_to_reserve
  from public.kit_inventory ki
  join public.orders o
    on o.gb_number=ki.gb_number
   and o.created_at>ki.updated_at
  join public.order_items oi
    on oi.order_id=o.order_id
   and oi.variant_id=ki.variant_id
  group by ki.gb_number,ki.variant_id
)
update public.kit_inventory ki
set remaining_qty=greatest(0,ki.remaining_qty-coalesce(lo.qty_to_reserve,0))
from later_orders lo
where ki.gb_number=lo.gb_number
  and ki.variant_id=lo.variant_id;

-- Atomic checkout: locks the exact remaining-vial row and decrements it
-- before creating the order. If anything fails, PostgreSQL rolls back both
-- the inventory change and the order.
create or replace function public.submit_group_buy_order(
  p_order_id text,
  p_gb_number text,
  p_email text,
  p_customer_name text,
  p_contact text,
  p_address text,
  p_total numeric,
  p_shipping_method text,
  p_shipping_fee numeric,
  p_payment_proof_url text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_gb public.group_buys%rowtype;
  v_customer_id uuid;
  v_item jsonb;
  v_variant_id text;
  v_qty integer;
  v_remaining integer;
begin
  if p_items is null
     or jsonb_typeof(p_items)<>'array'
     or jsonb_array_length(p_items)=0 then
    raise exception 'Your cart is empty.';
  end if;

  select * into v_gb
  from public.group_buys
  where gb_number=p_gb_number
    and status in ('OPEN','KIT_COMPLETION')
  for update;

  if not found then
    raise exception 'This Group Buy is no longer available.';
  end if;

  if not exists(
    select 1
    from public.admin_fee_payments af
    where af.gb_number=p_gb_number
      and lower(trim(coalesce(af.email,'')))=lower(trim(coalesce(p_email,'')))
      and af.status='PAID'
  ) then
    raise exception 'Your Admin Fee must be approved before you can submit an order.';
  end if;

  if v_gb.status='KIT_COMPLETION' then
    for v_item in select value from jsonb_array_elements(p_items) loop
      v_variant_id:=coalesce(v_item->>'variant_id','');
      v_qty:=coalesce((v_item->>'qty')::integer,0);

      if v_variant_id='' or v_qty<1 then
        raise exception 'Invalid kit completion quantity.';
      end if;

      select remaining_qty into v_remaining
      from public.kit_inventory
      where gb_number=p_gb_number
        and variant_id=v_variant_id
      for update;

      if not found or coalesce(v_remaining,0)<1 then
        raise exception 'This variant is no longer available. Please refresh and try again.';
      end if;

      if v_qty>v_remaining then
        raise exception 'Only % vial(s) remain for this variant. Please refresh and try again.',v_remaining;
      end if;

      update public.kit_inventory
      set remaining_qty=remaining_qty-v_qty,
          updated_at=now()
      where gb_number=p_gb_number
        and variant_id=v_variant_id;
    end loop;
  end if;

  insert into public.customers(email,customer_name,contact,address)
  values(
    lower(trim(p_email)),
    nullif(trim(p_customer_name),''),
    nullif(trim(p_contact),''),
    nullif(trim(p_address),'')
  )
  on conflict(email) do update
  set customer_name=coalesce(excluded.customer_name,public.customers.customer_name),
      contact=coalesce(excluded.contact,public.customers.contact),
      address=coalesce(excluded.address,public.customers.address)
  returning customer_id into v_customer_id;

  insert into public.orders(
    order_id,gb_number,customer_id,email,total,payment_status,
    shipping_method,shipping_fee,payment_proof_url,payment_reference,admin_note
  )
  values(
    p_order_id,p_gb_number,v_customer_id,lower(trim(p_email)),p_total,
    'PROOF SUBMITTED',nullif(trim(p_shipping_method),''),
    coalesce(p_shipping_fee,0),p_payment_proof_url,
    'QR PAYMENT','Customer uploaded payment proof'
  );

  insert into public.order_items(
    order_item_id,order_id,product_id,variant_id,product_name,
    strength,qty,unit_price,line_total
  )
  select
    gen_random_uuid(),p_order_id,
    nullif(value->>'product_id',''),
    nullif(value->>'variant_id',''),
    coalesce(value->>'product_name','Product'),
    nullif(value->>'strength',''),
    (value->>'qty')::integer,
    coalesce((value->>'unit_price')::numeric,0),
    coalesce((value->>'line_total')::numeric,0)
  from jsonb_array_elements(p_items);

  return jsonb_build_object(
    'order_id',p_order_id,
    'status','PROOF SUBMITTED',
    'mode',v_gb.status
  );
end;
$$;
