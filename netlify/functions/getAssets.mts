import type { Config } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseAdmin.mts';
import { jsonResponse, errorResponse, corsResponse } from '../lib/response.mts';

export const config: Config = {
  path: '/api/assets/:snapshotId',
  method: ['GET', 'OPTIONS'],
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const snapshotId = parts[parts.length - 1];

    if (!snapshotId) return errorResponse('snapshotId required', 400);

    const { data, error } = await supabaseAdmin
      .from('card_assets')
      .select('id, snapshot_id, format, url, width, height, created_at')
      .eq('snapshot_id', snapshotId);

    if (error) return errorResponse(error.message);

    // Sort: png first
    const sorted = (data || []).sort((a, b) => {
      return a.format === 'png' ? -1 : b.format === 'png' ? 1 : 0;
    });

    return jsonResponse({ assets: sorted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse(msg);
  }
};
