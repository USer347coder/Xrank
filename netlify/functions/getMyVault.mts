import type { Config } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseAdmin.mts';
import { jsonResponse, errorResponse, corsResponse } from '../lib/response.mts';
import { getUserIdFromRequest } from '../lib/auth.mts';

export const config: Config = {
  path: '/api/my-vault',
  method: ['GET', 'OPTIONS'],
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return errorResponse('Unauthorized', 401);

    // Fetch vault entries for this user
    const { data: entries, error } = await supabaseAdmin
      .from('vault_entries')
      .select('id, visibility, tags, created_at, snapshot_id')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return errorResponse(error.message);

    if (!entries || entries.length === 0) {
      return jsonResponse({ cards: [] });
    }

    // Fetch snapshots
    const snapshotIds = entries.map((e) => e.snapshot_id);
    const { data: snapshots } = await supabaseAdmin
      .from('snapshots')
      .select('*')
      .in('id', snapshotIds);

    const snapMap = new Map((snapshots || []).map((s) => [s.id, s]));

    // Fetch profiles for snapshots
    const profileIds = [...new Set((snapshots || []).map((s) => s.profile_id))];
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('id', profileIds);

    const profMap = new Map((profiles || []).map((p) => [p.id, p]));

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

    // Compose response
    const cards = entries.map((entry) => {
      const snap = snapMap.get(entry.snapshot_id);
      return {
        vaultEntry: {
          id: entry.id,
          visibility: entry.visibility,
          tags: entry.tags,
          created_at: entry.created_at,
        },
        snapshot: snap || null,
        profile: snap ? profMap.get(snap.profile_id) || null : null,
        assets: assetMap.get(entry.snapshot_id) || [],
      };
    });

    return jsonResponse({ cards });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse(msg);
  }
};
