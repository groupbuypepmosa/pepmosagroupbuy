-- PEPMOSA document library
create table if not exists public.library_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type in ('COA','PROTOCOL')),
  title text not null,
  product_name text,
  file_path text not null,
  file_name text,
  mime_type text,
  created_at timestamptz not null default now()
);
alter table public.library_documents enable row level security;
drop policy if exists "public read library documents" on public.library_documents;
create policy "public read library documents" on public.library_documents for select using (true);
drop policy if exists "admin manage library documents" on public.library_documents;
create policy "admin manage library documents" on public.library_documents for all using (is_admin()) with check (is_admin());
insert into storage.buckets (id,name,public) values ('library-documents','library-documents',false) on conflict (id) do nothing;
drop policy if exists "admin upload library documents" on storage.objects;
create policy "admin upload library documents" on storage.objects for insert to authenticated with check (bucket_id='library-documents' and is_admin());
drop policy if exists "admin delete library documents" on storage.objects;
create policy "admin delete library documents" on storage.objects for delete to authenticated using (bucket_id='library-documents' and is_admin());
drop policy if exists "public read library files" on storage.objects;
create policy "public read library files" on storage.objects for select using (bucket_id='library-documents');