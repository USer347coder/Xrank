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

    // Find profile
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('platform', 'x')
      .eq('username', username)
      .single();

    if (profErr || !profile) {
      return errorResponse('Profile not found', 404);
    }

    // Fetch all snapshots for this profile
    const { data: snapshots, error: snapErr } = await supabaseAdmin
      .from('snapshots')
      .select('*')
      .eq('profile_id', profile.id)
      .order('captured_at', { ascending: false });

    if (snapErr) return errorResponse(snapErr.message);

    const snapshotIds = (snapshots || []).map((s) => s.id);

    // Fetch public vault entries for these snapshots
    const { data: vaultEntries } = await supabaseAdmin
      .from('vault_entries')
      .select('*')
      .in('snapshot_id', snapshotIds)
      .in('visibility', ['public', 'unlisted']);

    const vaultMap = new Map((vaultEntries || []).map((v) => [v.snapshot_id, v]));

    // Fetch assets
    const { data: assets } = await supabaseAdmin
      .from('card_assets')
      .select('*')
      .in('snapshot_id', snapshotIds);

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
        profile,
        assets: assetMap.get(snap.id) || [],
      };
    });

    return jsonResponse({ profile, cards });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse(msg);
  }
};
