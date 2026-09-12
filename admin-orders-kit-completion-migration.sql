-- PEPMOSA ADMIN ORDERS -> KIT COMPLETION LINK
-- Admin orders are tagged to a Group Buy and automatically count against
-- kit_inventory so admin purchases participate in the same 10-vial completion.
alter table public.admin_orders add column if not exists gb_number text references public.group_buys(gb_number);
create index if not exists idx_admin_orders_gb_variant on public.admin_orders(gb_number,variant_id);
update public.admin_orders set gb_number=(select gb_number from public.group_buys order by created_at desc limit 1) where gb_number is null;

update public.kit_inventory ki
set remaining_qty=greatest(0,ki.remaining_qty-coalesce(x.admin_qty,0)),updated_at=now()
from (
  select gb_number,variant_id,sum(qty)::integer admin_qty
  from public.admin_orders where gb_number is not null and qty>0
  group by gb_number,variant_id
) x
where ki.gb_number=x.gb_number and ki.variant_id=x.variant_id;

create or replace function public.sync_admin_order_kit_inventory()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='INSERT' then
    update public.kit_inventory set remaining_qty=greatest(0,remaining_qty-new.qty::integer),updated_at=now()
    where gb_number=new.gb_number and variant_id=new.variant_id;
    return new;
  elsif tg_op='DELETE' then
    update public.kit_inventory set remaining_qty=least(kit_size,remaining_qty+old.qty::integer),updated_at=now()
    where gb_number=old.gb_number and variant_id=old.variant_id;
    return old;
  else
    if old.gb_number is not null and old.variant_id is not null then
      update public.kit_inventory set remaining_qty=least(kit_size,remaining_qty+old.qty::integer),updated_at=now()
      where gb_number=old.gb_number and variant_id=old.variant_id;
    end if;
    update public.kit_inventory set remaining_qty=greatest(0,remaining_qty-new.qty::integer),updated_at=now()
    where gb_number=new.gb_number and variant_id=new.variant_id;
    return new;
  end if;
end;
$$;
drop trigger if exists trg_admin_orders_kit_inventory on public.admin_orders;
create trigger trg_admin_orders_kit_inventory after insert or update or delete on public.admin_orders for each row execute function public.sync_admin_order_kit_inventory();
revoke execute on function public.sync_admin_order_kit_inventory() from public,anon,authenticated;