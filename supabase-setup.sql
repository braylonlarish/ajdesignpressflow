-- Press Flow shared workspace setup
-- Run this once in Supabase: SQL Editor > New query > Run.

create table if not exists public.pressflow_data (
  id smallint primary key check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_by_name text
);

alter table public.pressflow_data enable row level security;

drop policy if exists "Signed-in employees can view Press Flow" on public.pressflow_data;
create policy "Signed-in employees can view Press Flow"
on public.pressflow_data for select to authenticated using (true);

drop policy if exists "Signed-in employees can create Press Flow" on public.pressflow_data;
create policy "Signed-in employees can create Press Flow"
on public.pressflow_data for insert to authenticated
with check (auth.uid() = updated_by);

drop policy if exists "Signed-in employees can update Press Flow" on public.pressflow_data;
create policy "Signed-in employees can update Press Flow"
on public.pressflow_data for update to authenticated
using (true) with check (auth.uid() = updated_by);

alter table public.pressflow_data replica identity full;
alter publication supabase_realtime add table public.pressflow_data;
