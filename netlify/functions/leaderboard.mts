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

    // Fetch recent snapshots
    const { data: snaps, error: sErr } = await supabaseAdmin
      .from('snapshots')
      .select('*')
      .gte('captured_at', since)
      .order('captured_at', { ascending: false });

    if (sErr) return errorResponse(sErr.message);

    // Sort by score value descending, take top N
    const sorted = (snaps || [])
      .sort((a, b) => {
        const sa = (a.score as { value: number })?.value ?? 0;
        const sb = (b.score as { value: number })?.value ?? 0;
        return sb - sa;
      })
      .slice(0, limit);

    // Fetch profiles
    const profileIds = [...new Set(sorted.map((s) => s.profile_id))];
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('id', profileIds);

    const profMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Fetch assets
    const snapshotIds = sorted.map((s) => s.id);
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

    const items = sorted.map((s, idx) => ({
      rank: idx + 1,
      snapshot: s,
      profile: profMap.get(s.profile_id) || null,
      assets: (assetMap.get(s.id) || []).sort((x, y) =>
        x.format === 'png' ? -1 : y.format === 'png' ? 1 : 0
      ),
    }));

    return jsonResponse({ since, days, limit, items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse(msg);
  }
};
