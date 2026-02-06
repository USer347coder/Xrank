-- ============================================================
-- Social Score Vault — Schema
-- ============================================================

create extension if not exists pgcrypto;

-- PROFILES (tracked X accounts)
create table if not exists public.profiles (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null default 'x',
  username        text not null,
  display_name    text,
  avatar_url      text,
  verified        boolean default false,
  created_at      timestamptz not null default now(),
  last_fetched_at timestamptz
);

create unique index if not exists profiles_platform_username_uq
  on public.profiles(platform, username);

-- SNAPSHOTS (immutable card data)
create table if not exists public.snapshots (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  captured_at timestamptz not null,
  kpis        jsonb not null,
  score       jsonb not null,
  provenance  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists snapshots_profile_captured_idx
  on public.snapshots(profile_id, captured_at desc);

-- CARD ASSETS (render outputs)
create table if not exists public.card_assets (
  id          uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.snapshots(id) on delete cascade,
  format      text not null check (format in ('png','pdf')),
  url         text not null,
  width       int,
  height      int,
  created_at  timestamptz not null default now()
);

create unique index if not exists card_assets_snapshot_format_uq
  on public.card_assets(snapshot_id, format);

-- VAULT ENTRIES (ownership + visibility)
create table if not exists public.vault_entries (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id   uuid not null references public.snapshots(id) on delete cascade,
  visibility    text not null default 'public'
                  check (visibility in ('public','private','unlisted')),
  tags          text[] not null default '{}'::text[],
  created_at    timestamptz not null default now()
);

create index if not exists vault_entries_owner_idx
  on public.vault_entries(owner_user_id, created_at desc);

create index if not exists vault_entries_snapshot_idx
  on public.vault_entries(snapshot_id);

create index if not exists vault_entries_visibility_idx
  on public.vault_entries(visibility);
