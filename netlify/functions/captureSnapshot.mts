import type { Config, Context } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseAdmin.mts';
import { jsonResponse, errorResponse, corsResponse, normalizeUsername } from '../lib/response.mts';
import { fetchXProfile, type XProfileData } from '../lib/xProvider.mts';
import { socialScoreV1, computeTags } from '../../src/shared/score.ts';
import { renderCardForSnapshot } from './renderCard.mts';
import { getUserIdFromRequest } from '../lib/auth.mts';
import type { KPIs } from '../../src/shared/types.ts';

export const config: Config = {
  path: '/api/capture-snapshot',
  method: ['POST', 'OPTIONS'],
};

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    // Optional auth — don't fail if not signed in
    const userId = await getUserIdFromRequest(req);

    const body = await req.json();
    const rawUsername = body?.username;
    if (!rawUsername || typeof rawUsername !== 'string') {
      return errorResponse('username is required', 400);
    }

    const username = normalizeUsername(rawUsername);

    // 1. Check cache — skip X API if profile was fetched within 24h
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('platform', 'x')
      .eq('username', username)
      .single();

    let xData: XProfileData;

    if (
      existingProfile?.last_fetched_at &&
      Date.now() - new Date(existingProfile.last_fetched_at).getTime() < CACHE_TTL_MS
    ) {
      // Fresh data in cache — look up latest snapshot's KPIs
      const { data: latestSnap } = await supabaseAdmin
        .from('snapshots')
        .select('kpis')
        .eq('profile_id', existingProfile.id)
        .order('captured_at', { ascending: false })
        .limit(1)
        .single();

      if (latestSnap?.kpis) {
        xData = {
          username: existingProfile.username,
          displayName: existingProfile.display_name || existingProfile.username,
          avatarUrl: existingProfile.avatar_url || `https://unavatar.io/x/${username}`,
          verified: existingProfile.verified || false,
          bio: existingProfile.bio || '',
          kpis: latestSnap.kpis as KPIs,
          source: 'cached',
          sourceDetail: `last_fetched ${existingProfile.last_fetched_at}`,
        };
        console.log(`[captureSnapshot] Cache HIT for @${username} — skipping X API (fetched ${existingProfile.last_fetched_at})`);
      } else {
        // Profile exists but no snapshots — fetch fresh
        xData = await fetchXProfile(username);
      }
    } else {
      // No profile or stale — fetch from X API
      xData = await fetchXProfile(username);
    }

    console.log(`[captureSnapshot] Data source: ${xData.source}${xData.sourceDetail ? ` (${xData.sourceDetail})` : ''}`);
    console.log(`[captureSnapshot] KPIs for @${username}:`, JSON.stringify(xData.kpis));

    // 2. Upsert profile row (only update last_fetched_at for fresh fetches)
    const profileUpsertData: Record<string, unknown> = {
      platform: 'x',
      username: xData.username.toLowerCase(),
      display_name: xData.displayName,
      avatar_url: xData.avatarUrl,
      verified: xData.verified,
      bio: xData.bio || '',
    };
    if (xData.source !== 'cached') {
      profileUpsertData.last_fetched_at = new Date().toISOString();
    }

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        profileUpsertData,
        { onConflict: 'platform,username' }
      )
      .select('*')
      .single();

    if (profErr || !profile) {
      return errorResponse(`Profile upsert failed: ${profErr?.message}`, 500);
    }

    // 3. Compute score
    const score = socialScoreV1(xData.kpis);

    // 4. Check for previous snapshots (for tags + card_number)
    const { count: existingCount } = await supabaseAdmin
      .from('snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id);

    const cardNumber = (existingCount || 0) + 1;
    const isFirstSnapshot = cardNumber === 1;

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

    // 5. Insert snapshot with card_number
    const { data: snapshot, error: snapErr } = await supabaseAdmin
      .from('snapshots')
      .insert({
        profile_id: profile.id,
        captured_at: capturedAt.toISOString(),
        kpis: xData.kpis,
        score,
        card_number: cardNumber,
        provenance: {
          source: xData.source,
          sourceDetail: xData.sourceDetail,
          tags,
        },
      })
      .select('*')
      .single();

    if (snapErr || !snapshot) {
      return errorResponse(`Snapshot insert failed: ${snapErr?.message}`, 500);
    }

    // 5b. Auto-save to vault
    try {
      const vaultData: Record<string, unknown> = {
        snapshot_id: snapshot.id,
        visibility: 'public',
        tags: [],
      };

      if (userId) {
        vaultData.owner_user_id = userId;
      } else {
        vaultData.owner_profile_id = profile.id;
      }

      const { error: vaultErr } = await supabaseAdmin
        .from('vault_entries')
        .insert(vaultData);

      if (vaultErr) {
        console.warn('[captureSnapshot] Auto-vault insert failed:', vaultErr.message);
      }
    } catch (vaultEx) {
      console.warn('[captureSnapshot] Auto-vault error:', vaultEx);
    }

    // 6. Render card (await). Netlify V2 function routing does not expose /.netlify/functions,
    // so background function invocation is unreliable here; awaiting is robust.
    try {
      console.log('[captureSnapshot] Render start', snapshot.id);
      await renderCardForSnapshot(snapshot.id);
      console.log('[captureSnapshot] Render complete', snapshot.id);
    } catch (err) {
      console.error('[captureSnapshot] Render failed', snapshot.id, err);
    }

    // Try to fetch any assets already present
    const { data: assetRows } = await supabaseAdmin
      .from('card_assets')
      .select('*')
      .eq('snapshot_id', snapshot.id);

    // 7. Return with snapshot data + any existing assets; frontend will poll
    return jsonResponse({
      profile,
      snapshot,
      assets: assetRows || [],
      tags,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[captureSnapshot] Error:', msg);
    return errorResponse(msg);
  }
};
