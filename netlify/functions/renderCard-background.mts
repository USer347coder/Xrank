import type { Config, Context } from '@netlify/functions';
import { corsResponse, errorResponse, jsonResponse } from '../lib/response.mts';
import { renderCardForSnapshot } from './renderCard.mts';

export const config: Config = {
  path: '/api/render-card-background',
  method: ['POST', 'OPTIONS'],
};

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const body = await req.json();
    const snapshotId = body?.snapshotId;
    if (!snapshotId || typeof snapshotId !== 'string') {
      return errorResponse('snapshotId required', 400);
    }

    console.log('[renderCard-background] start', snapshotId);
    const result = await renderCardForSnapshot(snapshotId);
    console.log('[renderCard-background] complete', snapshotId);

    // Note: Background functions always respond 202 to the caller; body may be ignored.
    return jsonResponse({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[renderCard-background] failed', msg);
    return errorResponse(msg);
  }
};

