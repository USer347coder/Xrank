import type { Config } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseAdmin.mts';
import { jsonResponse, errorResponse, corsResponse, normalizeUsername } from '../lib/response.mts';

export const config: Config = {
  path: '/api/vault/:username',
  method: ['GET', 'OPTIONS'],
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const rawUsername = parts[parts.length - 1];

    if (!rawUsername) return errorResponse('username required', 400);
    const username = normalizeUsername(rawUsername);

    // Find all matching profiles (case-insensitive) to tolerate historical duplicates.
    // Use a broad match then normalize in code so we also catch rows like "@elonmusk" or "elonmusk ".
    const { data: profileCandidates, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('platform', 'x')
      .ilike('username', `%${username}%`)
      .limit(50);

    const profiles = (profileCandidates || []).filter((p) => normalizeUsername(p.username) === username);

    if (profErr || profiles.length === 0) {
      return errorResponse('Profile not found', 404);
    }

    const profileIds = profiles.map((p) => p.id);
    const profileById = new Map(profiles.map((p) => [p.id, p]));

    // Canonical profile for page header
    const canonical =
      profiles.find((p) => p.username === username) ||
      [...profiles].sort((a, b) => {
        const la = a.last_fetched_at ? new Date(a.last_fetched_at).getTime() : 0;
        const lb = b.last_fetched_at ? new Date(b.last_fetched_at).getTime() : 0;
        return lb - la;
      })[0];

    // Fetch all snapshots for any matching profile row
    const { data: snapshots, error: snapErr } = await supabaseAdmin
      .from('snapshots')
      .select('*')
      .in('profile_id', profileIds)
      .order('captured_at', { ascending: false });

    if (snapErr) return errorResponse(snapErr.message);

    const snapshotIds = (snapshots || []).map((s) => s.id);

    // Fetch public vault entries for these snapshots
    const { data: vaultEntries } = snapshotIds.length > 0
      ? await supabaseAdmin
        .from('vault_entries')
        .select('*')
        .in('snapshot_id', snapshotIds)
        .in('visibility', ['public', 'unlisted'])
      : { data: [] };

    const vaultMap = new Map((vaultEntries || []).map((v) => [v.snapshot_id, v]));

    // Fetch assets
    const { data: assets } = snapshotIds.length > 0
      ? await supabaseAdmin
        .from('card_assets')
        .select('*')
        .in('snapshot_id', snapshotIds)
      : { data: [] };

    const assetMap = new Map<string, typeof assets>();
    for (const a of assets || []) {
      const list = assetMap.get(a.snapshot_id) || [];
      list.push(a);
      assetMap.set(a.snapshot_id, list);
    }

    // Compose timeline — include all snapshots (even without vault entries)
    const cards = (snapshots || []).map((snap) => {
      const ve = vaultMap.get(snap.id);
      return {
        vaultEntry: ve
          ? { id: ve.id, visibility: ve.visibility, tags: ve.tags, created_at: ve.created_at }
          : null,
        snapshot: snap,
        profile: profileById.get(snap.profile_id) || canonical,
        assets: assetMap.get(snap.id) || [],
      };
    });

    return jsonResponse({ profile: canonical, cards });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse(msg);
  }
};
