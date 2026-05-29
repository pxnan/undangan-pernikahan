create table if not exists public.wedding_contents (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_messages (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null check (char_length(guest_name) between 1 and 120),
  message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.wedding_contents enable row level security;
alter table public.guest_messages enable row level security;

drop policy if exists "Public can read wedding content" on public.wedding_contents;
create policy "Public can read wedding content"
on public.wedding_contents for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated admin can manage wedding content" on public.wedding_contents;
create policy "Authenticated admin can manage wedding content"
on public.wedding_contents for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read guest messages" on public.guest_messages;
create policy "Public can read guest messages"
on public.guest_messages for select
to anon, authenticated
using (true);

drop policy if exists "Public can add guest messages" on public.guest_messages;
create policy "Public can add guest messages"
on public.guest_messages for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated admin can delete guest messages" on public.guest_messages;
create policy "Authenticated admin can delete guest messages"
on public.guest_messages for delete
to authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('wedding-assets', 'wedding-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read wedding assets" on storage.objects;
create policy "Public can read wedding assets"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'wedding-assets');

drop policy if exists "Authenticated admin can upload wedding assets" on storage.objects;
create policy "Authenticated admin can upload wedding assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'wedding-assets');

drop policy if exists "Authenticated admin can update wedding assets" on storage.objects;
create policy "Authenticated admin can update wedding assets"
on storage.objects for update
to authenticated
using (bucket_id = 'wedding-assets')
with check (bucket_id = 'wedding-assets');

drop policy if exists "Authenticated admin can delete wedding assets" on storage.objects;
create policy "Authenticated admin can delete wedding assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'wedding-assets');
