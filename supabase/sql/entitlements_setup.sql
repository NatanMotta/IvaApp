-- Entitlements / Subscription setup for IvaApp
-- Apply in Supabase SQL editor (project owner role)

-- 1) Extend profiles with subscription fields
alter table public.profiles
  add column if not exists subscription_tier text not null default 'free',
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_provider text,
  add column if not exists subscription_customer_id text,
  add column if not exists stripe_subscription_id text;

create index if not exists idx_profiles_subscription_customer_id
  on public.profiles(subscription_customer_id);

-- Add basic validation checks (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_subscription_tier_check'
  ) then
    alter table public.profiles
      add constraint profiles_subscription_tier_check
      check (subscription_tier in ('free', 'pro'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_subscription_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_subscription_status_check
      check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'canceled'));
  end if;
end $$;

-- 2) Helpers for entitlement checks
create or replace function public.user_has_pro_access(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.subscription_tier = 'pro'
      and p.subscription_status in ('active', 'trialing')
  );
$$;

create or replace function public.can_access_modulo(p_user_id uuid, p_modulo_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.moduli m
    where m.id = p_modulo_id
      and m.is_attivo = true
      and public.user_has_pro_access(p_user_id)
  );
$$;

-- 3) RLS policies
alter table public.profiles enable row level security;
alter table public.moduli enable row level security;
alter table public.sezioni enable row level security;
alter table public.quiz enable row level security;

-- profiles: each user reads/updates only itself
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- moduli: only active rows for Pro users (all content is premium)
drop policy if exists moduli_select_entitled on public.moduli;
create policy moduli_select_entitled
on public.moduli
for select
using (
  is_attivo = true
  and public.user_has_pro_access(auth.uid())
);

-- sezioni: visible only if parent modulo is accessible by Pro entitlement
drop policy if exists sezioni_select_entitled on public.sezioni;
create policy sezioni_select_entitled
on public.sezioni
for select
using (
  is_attivo = true
  and exists (
    select 1
    from public.moduli m
    where m.id = sezioni.modulo_id
      and m.is_attivo = true
      and public.user_has_pro_access(auth.uid())
  )
);

-- quiz: visible only if parent modulo is accessible by Pro entitlement
drop policy if exists quiz_select_entitled on public.quiz;
create policy quiz_select_entitled
on public.quiz
for select
using (
  is_attivo = true
  and exists (
    select 1
    from public.sezioni s
    join public.moduli m on m.id = s.modulo_id
    where s.id = quiz.sezione_id
      and s.is_attivo = true
      and m.is_attivo = true
      and public.user_has_pro_access(auth.uid())
  )
);

-- 4) Optional: grant execute to authenticated role
-- (often already granted by default; included here for clarity)
grant execute on function public.user_has_pro_access(uuid) to authenticated;
grant execute on function public.can_access_modulo(uuid, bigint) to authenticated;
