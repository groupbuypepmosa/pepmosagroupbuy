-- PEPMOSA: public-safe admin fee access lookup for storefront email verification
-- Run this once in Supabase SQL Editor.

create or replace function public.check_group_buy_access(
  p_gb_number text,
  p_email text,
  p_payment_id uuid default null
)
returns table (
  status text,
  payment_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.status,
    p.id
  from public.admin_fee_payments p
  where p.gb_number = p_gb_number
    and (
      lower(trim(coalesce(p.email,''))) = lower(trim(coalesce(p_email,'')))
      or (
        p_payment_id is not null
        and p.id = p_payment_id
        and p.email is null
      )
    )
  order by
    case p.status when 'PAID' then 0 when 'SUBMITTED' then 1 else 2 end,
    p.created_at desc
  limit 1
$$;

revoke all on function public.check_group_buy_access(text,text,uuid) from public;
grant execute on function public.check_group_buy_access(text,text,uuid) to anon, authenticated;
