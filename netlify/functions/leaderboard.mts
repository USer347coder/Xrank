import type { Config } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseAdmin.mts';
import { jsonResponse, errorResponse, corsResponse } from '../lib/response.mts';

export const config: Config = {
  path: '/api/leaderboard',
  method: ['GET', 'OPTIONS'],
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '24', 10), 100);
    const days = Math.min(parseInt(url.searchParams.get('days') || '7', 10), 30);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Only list snapshots that have at least one PUBLIC vault entry.
    // Push sorting/limiting into SQL.
    const { data: snaps, error: sErr, count: total } = await supabaseAdmin
      .from('snapshots')
      .select(
        'id, profile_id, score, captured_at, card_number, provenance, vault_entries(visibility)',
        { count: 'exact' }
      )
      .gte('captured_at', since)
      .order('score->>value', { ascending: false })
      .limit(limit * 2);

    if (sErr) return errorResponse(sErr.message);

    const withAccess = (snaps || []).filter((snap) => {
      const entries = (snap as any).vault_entries;
      if (!entries || entries.length === 0) return true;
      return entries.some((entry: { visibility: string }) => entry.visibility !== 'private');
    });
    const sorted = withAccess.slice(0, limit);
    const shareableTotal = withAccess.length;

    // Fetch profiles
    const profileIds = [...new Set(sorted.map((s) => s.profile_id))];
    const { data: profiles } = profileIds.length > 0
      ? await supabaseAdmin.from('profiles').select('*').in('id', profileIds)
      : { data: [] };

    const profMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Fetch assets only for the selected snapshots
    const snapshotIds = sorted.map((s) => s.id);
    const { data: assets } = snapshotIds.length > 0
      ? await supabaseAdmin.from('card_assets').select('*').in('snapshot_id', snapshotIds)
      : { data: [] };

    const assetMap = new Map<string, typeof assets>();
    for (const a of assets || []) {
      const list = assetMap.get(a.snapshot_id) || [];
      list.push(a);
      assetMap.set(a.snapshot_id, list);
    }

    const items = sorted.map((s, idx) => ({
      rank: idx + 1,
      total: shareableTotal,
      snapshot: s,
      profile: profMap.get(s.profile_id) || null,
      assets: (assetMap.get(s.id) || []).sort((x, y) =>
        x.format === 'png' ? -1 : y.format === 'png' ? 1 : 0
      ),
    }));

    return jsonResponse({ since, days, limit, total: shareableTotal, items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse(msg);
  }
};
