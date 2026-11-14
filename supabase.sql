-- Run this complete script in Supabase: SQL Editor > New query > Run.
create table if not exists public.queues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tokens (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.queues(id) on delete cascade,
  number integer not null,
  name text not null,
  status text not null default 'waiting' check (status in ('waiting','served','cancelled')),
  position integer not null default 0,
  wait_minutes integer,
  created_at timestamptz not null default now()
);

create index if not exists tokens_queue_id_idx on public.tokens(queue_id);
create index if not exists queues_owner_id_idx on public.queues(owner_id);

alter table public.queues enable row level security;
alter table public.tokens enable row level security;

create policy "Managers can view their queues" on public.queues
for select to authenticated using (auth.uid() = owner_id);
create policy "Managers can create their queues" on public.queues
for insert to authenticated with check (auth.uid() = owner_id);
create policy "Managers can update their queues" on public.queues
for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Managers can delete their queues" on public.queues
for delete to authenticated using (auth.uid() = owner_id);

create policy "Managers can view tokens in their queues" on public.tokens
for select to authenticated using (exists (select 1 from public.queues q where q.id = queue_id and q.owner_id = auth.uid()));
create policy "Managers can add tokens to their queues" on public.tokens
for insert to authenticated with check (exists (select 1 from public.queues q where q.id = queue_id and q.owner_id = auth.uid()));
create policy "Managers can update tokens in their queues" on public.tokens
for update to authenticated using (exists (select 1 from public.queues q where q.id = queue_id and q.owner_id = auth.uid()))
with check (exists (select 1 from public.queues q where q.id = queue_id and q.owner_id = auth.uid()));
create policy "Managers can delete tokens in their queues" on public.tokens
for delete to authenticated using (exists (select 1 from public.queues q where q.id = queue_id and q.owner_id = auth.uid()));
