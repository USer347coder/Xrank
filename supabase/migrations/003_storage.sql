-- ============================================================
-- Social Score Vault — Storage Bucket
-- ============================================================

-- Create "cards" bucket (public read for card images)
insert into storage.buckets (id, name, public)
values ('cards', 'cards', true)
on conflict (id) do nothing;

-- Anyone can read objects in "cards" bucket
drop policy if exists "cards_public_read" on storage.objects;
create policy "cards_public_read"
  on storage.objects for select
  using (bucket_id = 'cards');

-- Service role handles uploads (via service key, bypasses RLS)
-- No insert policy needed for anon/authenticated
