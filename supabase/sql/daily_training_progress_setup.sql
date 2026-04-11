-- Daily training progress setup for IvaApp
-- Apply in Supabase SQL editor (project owner role)

create table if not exists public.allenamento_giornaliero (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  training_date date not null default current_date,
  modulo_id bigint references public.moduli(id) on delete set null,
  sezione_id bigint references public.sezioni(id) on delete set null,
  podcast_completato boolean not null default false,
  quiz_completato boolean not null default false,
  ripasso_completato boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, training_date)
);

create index if not exists idx_allenamento_giornaliero_user_date
  on public.allenamento_giornaliero(user_id, training_date desc);

create or replace function public.set_allenamento_giornaliero_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_allenamento_giornaliero_updated_at on public.allenamento_giornaliero;
create trigger trg_allenamento_giornaliero_updated_at
before update on public.allenamento_giornaliero
for each row
execute function public.set_allenamento_giornaliero_updated_at();

alter table public.allenamento_giornaliero enable row level security;

drop policy if exists allenamento_giornaliero_select_own on public.allenamento_giornaliero;
create policy allenamento_giornaliero_select_own
on public.allenamento_giornaliero
for select
using (auth.uid() = user_id);

drop policy if exists allenamento_giornaliero_insert_own on public.allenamento_giornaliero;
create policy allenamento_giornaliero_insert_own
on public.allenamento_giornaliero
for insert
with check (auth.uid() = user_id);

drop policy if exists allenamento_giornaliero_update_own on public.allenamento_giornaliero;
create policy allenamento_giornaliero_update_own
on public.allenamento_giornaliero
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Optional: allow row deletion by owner if you need cleanup/restart flows.
drop policy if exists allenamento_giornaliero_delete_own on public.allenamento_giornaliero;
create policy allenamento_giornaliero_delete_own
on public.allenamento_giornaliero
for delete
using (auth.uid() = user_id);
