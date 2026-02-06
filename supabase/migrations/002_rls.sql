-- ============================================================
-- Social Score Vault — Row Level Security
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles      enable row level security;
alter table public.snapshots     enable row level security;
alter table public.card_assets   enable row level security;
alter table public.vault_entries enable row level security;

-- ── PROFILES ──
-- Readable by anyone (public data)
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Writable only by service role (functions bypass RLS with service key)
-- No insert/update/delete policies for anon/authenticated = blocked by default

-- ── SNAPSHOTS ──
-- Readable by anyone
drop policy if exists "snapshots_read_all" on public.snapshots;
create policy "snapshots_read_all"
  on public.snapshots for select
  to anon, authenticated
  using (true);

-- ── CARD_ASSETS ──
-- Readable by anyone (URLs controlled by bucket settings)
drop policy if exists "card_assets_read_all" on public.card_assets;
create policy "card_assets_read_all"
  on public.card_assets for select
  to anon, authenticated
  using (true);

-- ── VAULT_ENTRIES ──
-- Owner can do everything with their own entries
drop policy if exists "vault_owner_all" on public.vault_entries;
create policy "vault_owner_all"
  on public.vault_entries for all
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Anyone can read public entries
drop policy if exists "vault_public_read" on public.vault_entries;
create policy "vault_public_read"
  on public.vault_entries for select
  to anon, authenticated
  using (visibility = 'public');

-- Unlisted: readable by anyone (but not indexed/listed in leaderboards)
drop policy if exists "vault_unlisted_read" on public.vault_entries;
create policy "vault_unlisted_read"
  on public.vault_entries for select
  to anon, authenticated
  using (visibility = 'unlisted');
