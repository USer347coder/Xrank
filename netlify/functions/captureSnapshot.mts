import type { Config, Context } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseAdmin.mts';
import { jsonResponse, errorResponse, corsResponse, normalizeUsername } from '../lib/response.mts';
import { fetchXProfile } from '../lib/xProvider.mts';
import { socialScoreV1, computeTags } from '../../src/shared/score.ts';
import { renderCardForSnapshot } from './renderCard.mts';

export const config: Config = {
  path: '/api/capture-snapshot',
  method: ['POST', 'OPTIONS'],
};

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const body = await req.json();
    const rawUsername = body?.username;
    if (!rawUsername || typeof rawUsername !== 'string') {
      return errorResponse('username is required', 400);
    }

    const username = normalizeUsername(rawUsername);

    // 1. Fetch X profile data (mock or real)
    const xData = await fetchXProfile(username);

    // 2. Upsert profile row
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          platform: 'x',
          username: xData.username.toLowerCase(),
          display_name: xData.displayName,
          avatar_url: xData.avatarUrl,
          verified: xData.verified,
          last_fetched_at: new Date().toISOString(),
        },
        { onConflict: 'platform,username' }
      )
      .select('*')
      .single();

    if (profErr || !profile) {
      return errorResponse(`Profile upsert failed: ${profErr?.message}`, 500);
    }

    // 3. Compute score
    const score = socialScoreV1(xData.kpis);

    // 4. Check for previous snapshots (for tags)
    const { count: existingCount } = await supabaseAdmin
      .from('snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id);

    const isFirstSnapshot = !existingCount || existingCount === 0;

    // Get previous score for foil detection
    let previousScore: number | null = null;
    if (!isFirstSnapshot) {
      const { data: prevSnap } = await supabaseAdmin
        .from('snapshots')
        .select('score')
        .eq('profile_id', profile.id)
        .order('captured_at', { ascending: false })
        .limit(1)
        .single();

      if (prevSnap?.score) {
        previousScore = (prevSnap.score as { value: number }).value;
      }
    }

    const capturedAt = new Date();
    const tags = computeTags(score, previousScore, isFirstSnapshot, capturedAt);

    // 5. Insert snapshot
    const { data: snapshot, error: snapErr } = await supabaseAdmin
      .from('snapshots')
      .insert({
        profile_id: profile.id,
        captured_at: capturedAt.toISOString(),
        kpis: xData.kpis,
        score,
        provenance: {
          source: process.env.X_BEARER_TOKEN ? 'x_api' : 'mock',
          tags,
        },
      })
      .select('*')
      .single();

    if (snapErr || !snapshot) {
      return errorResponse(`Snapshot insert failed: ${snapErr?.message}`, 500);
    }

    // 6. Render card — fire and forget (don't await, let it run)
    // Use void to explicitly mark as intentionally not awaited
    void renderCardForSnapshot(snapshot.id).catch((err) => {
      console.error('[captureSnapshot] Background card render failed:', err);
    });

    // 7. Return immediately with snapshot data
    return jsonResponse({
      profile,
      snapshot,
      assets: [], // will be available after background render completes
      tags,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[captureSnapshot] Error:', msg);
    return errorResponse(msg);
  }
};
