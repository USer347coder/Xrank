import type { Config } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseAdmin.mts';
import { jsonResponse, errorResponse, corsResponse } from '../lib/response.mts';
import { generateQrDataUri } from '../lib/qr.mts';
import { shortId } from '../../src/shared/score.ts';

export const config: Config = {
  path: '/api/card/:snapshotId',
  method: ['GET', 'OPTIONS'],
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const snapshotId = parts[parts.length - 1];

    if (!snapshotId) return errorResponse('snapshotId required', 400);

    // Fetch snapshot
    const { data: snap, error: snapErr } = await supabaseAdmin
      .from('snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single();

    if (snapErr || !snap) return errorResponse('Snapshot not found', 404);

    // Fetch profile
    const { data: prof, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', snap.profile_id)
      .single();

    if (profErr || !prof) return errorResponse('Profile not found', 404);

    // Fetch assets
    const { data: assets } = await supabaseAdmin
      .from('card_assets')
      .select('*')
      .eq('snapshot_id', snapshotId);

    // Generate QR
    const siteUrl = process.env.SITE_URL || '';
    const qrUrl = await generateQrDataUri(`${siteUrl}/card/${snap.id}`);

    return jsonResponse({
      profile: prof,
      snapshot: snap,
      assets: assets || [],
      cardId: shortId(snap.id),
      qrUrl,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse(msg);
  }
};
