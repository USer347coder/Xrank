import type { Config } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseAdmin.mts';
import { jsonResponse, errorResponse, corsResponse } from '../lib/response.mts';
import { getUserIdFromRequest } from '../lib/auth.mts';

export const config: Config = {
  path: '/api/assets/:snapshotId',
  method: ['GET', 'OPTIONS'],
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const userId = await getUserIdFromRequest(req);
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const snapshotId = parts[parts.length - 1];

    if (!snapshotId) return errorResponse('snapshotId required', 400);

    // Visibility check: require a public or unlisted vault entry, or ownership for private
    const { data: vaultRows, error: vErr } = await supabaseAdmin
      .from('vault_entries')
      .select('owner_user_id, visibility')
      .eq('snapshot_id', snapshotId);

    if (vErr) return errorResponse(vErr.message);
    // If no vault entries exist yet (fresh mint), allow access.
    const noVaultEntries = !vaultRows || vaultRows.length === 0;

    const isPublic = vaultRows?.some((v) => v.visibility === 'public' || v.visibility === 'unlisted');
    const isOwner = userId ? vaultRows?.some((v) => v.owner_user_id === userId) : false;

    if (!noVaultEntries && !isPublic && !isOwner) return errorResponse('Forbidden', 403);

    const { data, error } = await supabaseAdmin
      .from('card_assets')
      .select('id, snapshot_id, format, url, width, height, created_at')
      .eq('snapshot_id', snapshotId);

    if (error) return errorResponse(error.message);

    // Sort: png first
    const sorted = (data || []).sort((a, b) => {
      return a.format === 'png' ? -1 : b.format === 'png' ? 1 : 0;
    });

    // Issue signed URLs (short-lived) to avoid leaking permanent URLs
    const signed = await Promise.all(
      sorted.map(async (a) => {
        let objectPath = '';
        try {
          const u = new URL(a.url);
          const [, after] = u.pathname.split('/object/');
          objectPath = after || '';
        } catch {
          objectPath = '';
        }
        // Expect pattern public/cards/<file>
        const pathInBucket = objectPath.replace(/^public\/cards\//, '');
        if (!pathInBucket) return a;
        const { data: signedUrlData } = await supabaseAdmin.storage
          .from('cards')
          .createSignedUrl(pathInBucket, 900);
        return { ...a, url: signedUrlData?.signedUrl || a.url };
      })
    );

    return jsonResponse({ assets: signed });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse(msg);
  }
};
