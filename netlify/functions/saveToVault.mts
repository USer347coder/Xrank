import type { Config } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseAdmin.mts';
import { jsonResponse, errorResponse, corsResponse } from '../lib/response.mts';
import { getUserIdFromRequest } from '../lib/auth.mts';

export const config: Config = {
  path: '/api/save-to-vault',
  method: ['POST', 'OPTIONS'],
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    // Auth required
    const userId = await getUserIdFromRequest(req);
    if (!userId) return errorResponse('Unauthorized', 401);

    const body = await req.json();
    const { snapshotId, visibility } = body || {};

    if (!snapshotId) return errorResponse('snapshotId required', 400);

    const vis = visibility || 'public';
    if (!['public', 'private', 'unlisted'].includes(vis)) {
      return errorResponse('Invalid visibility (public|private|unlisted)', 400);
    }

    // Verify snapshot exists
    const { data: snap } = await supabaseAdmin
      .from('snapshots')
      .select('id')
      .eq('id', snapshotId)
      .single();

    if (!snap) return errorResponse('Snapshot not found', 404);

    // Insert vault entry
    const { data: entry, error } = await supabaseAdmin
      .from('vault_entries')
      .insert({
        owner_user_id: userId,
        snapshot_id: snapshotId,
        visibility: vis,
        tags: [],
      })
      .select('*')
      .single();

    if (error) return errorResponse(error.message);

    return jsonResponse({ ok: true, vaultEntry: entry });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse(msg);
  }
};
