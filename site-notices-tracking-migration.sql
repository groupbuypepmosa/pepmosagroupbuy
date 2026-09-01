-- PEPMOSA stable repair: Site Notice + consolidated tracking.
-- This migration is already applied to the connected Supabase production project.

create table if not exists public.site_notices (
  notice_id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  notice_type text not null default 'INFO' check (notice_type in ('INFO','UPDATE','ANNOUNCEMENT','WARNING','URGENT')),
  button_text text,
  button_url text,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_site_notices_active on public.site_notices(active, starts_at, ends_at, created_at desc);
alter table public.site_notices enable row level security;
drop policy if exists "public read active site notices" on public.site_notices;
create policy "public read active site notices" on public.site_notices for select using (active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()));
drop policy if exists "admin site notices access" on public.site_notices;
create policy "admin site notices access" on public.site_notices for all using (is_admin()) with check (is_admin());

alter table public.orders add column if not exists shipment_id text;
create table if not exists public.consolidated_shipments (
  shipment_id text primary key default ('SHP-'||to_char(now(),'YYYYMMDDHH24MISSMS')),
  email text not null,
  customer_id uuid references public.customers(customer_id),
  status text not null default 'ORDER RECEIVED',
  courier text,
  tracking_number text,
  waybill_number text,
  notes text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.shipment_status_history (
  id uuid primary key default gen_random_uuid(),
  shipment_id text not null references public.consolidated_shipments(shipment_id) on delete cascade,
  status text not null,
  courier text,
  tracking_number text,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_shipments_email on public.consolidated_shipments(lower(email));
create index if not exists idx_shipment_history_shipment on public.shipment_status_history(shipment_id,created_at);
create index if not exists idx_orders_shipment on public.orders(shipment_id);
alter table public.consolidated_shipments enable row level security;
alter table public.shipment_status_history enable row level security;
drop policy if exists "admin shipments access" on public.consolidated_shipments;
create policy "admin shipments access" on public.consolidated_shipments for all using (is_admin()) with check (is_admin());
drop policy if exists "admin shipment history access" on public.shipment_status_history;
create policy "admin shipment history access" on public.shipment_status_history for all using (is_admin()) with check (is_admin());

create or replace function public.get_customer_tracking(p_email text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare e text:=lower(trim(coalesce(p_email,'')));
begin
  if length(e)<5 then return jsonb_build_object('orders','[]'::jsonb,'shipments','[]'::jsonb); end if;
  return jsonb_build_object(
    'orders',coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from orders o where lower(o.email)=e),'[]'::jsonb),
    'shipments',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from consolidated_shipments s where lower(s.email)=e),'[]'::jsonb)
  );
end; $$;
revoke all on function public.get_customer_tracking(text) from public;
grant execute on function public.get_customer_tracking(text) to anon,authenticated;

alter table public.group_buys drop constraint if exists group_buys_status_check;
alter table public.group_buys add constraint group_buys_status_check check(status in ('OPEN','CLOSED','KIT_COMPLETION'));
