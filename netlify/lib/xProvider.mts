import type { KPIs } from '../../src/shared/types.ts';

export interface XProfileData {
  username: string;
  displayName: string;
  avatarUrl: string;
  verified: boolean;
  bio: string;
  kpis: KPIs;
  source: 'x_api' | 'mock' | 'cached';
  sourceDetail?: string; // e.g. "402 CreditsDepleted"
}

/**
 * Simple string hash for deterministic mock data.
 */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seeded(seed: number, min: number, max: number): number {
  // LCG-like deterministic value
  const v = ((seed * 1103515245 + 12345) >>> 16) & 0x7fff;
  return min + (v / 0x7fff) * (max - min);
}

/**
 * Generate deterministic mock data for a given username.
 */
function mockXProfile(username: string, detail?: string): XProfileData {
  const h = hashStr(username);

  const followers = Math.round(seeded(h, 100, 5_000_000));
  const following = Math.round(seeded(h + 1, 10, 5_000));
  const posts = Math.round(seeded(h + 2, 50, 80_000));
  const listed = Math.round(seeded(h + 3, 0, 50_000));
  const avgEngPerPost = Math.round(seeded(h + 4, 1, Math.max(10, followers / 500)));
  const velocity7d = Math.round(seeded(h + 5, 0, 50));

  return {
    username,
    displayName: username.charAt(0).toUpperCase() + username.slice(1),
    avatarUrl: `https://unavatar.io/x/${username}`,
    verified: followers > 1_000_000,
    bio: `Content creator & digital native. Building in public.`,
    kpis: { followers, following, posts, listed, avgEngPerPost, velocity7d },
    source: 'mock',
    sourceDetail: detail || 'no_token',
  };
}

/**
 * Fetch X profile data. Uses real API if X_BEARER_TOKEN is set,
 * otherwise returns deterministic mock data.
 */
export async function fetchXProfile(username: string): Promise<XProfileData> {
  const token = process.env.X_BEARER_TOKEN;

  if (!token) {
    console.log(`[xProvider] No X_BEARER_TOKEN — using mock data for @${username}`);
    return mockXProfile(username, 'no_token');
  }

  // ── Real X API v2 ──
  try {
    // Fetch user info
    const userUrl = `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics,verified,profile_image_url,name,description`;
    console.log(`[xProvider] Fetching X API: ${userUrl.split('?')[0]}`);

    const userRes = await fetch(userUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`[xProvider] X API response: ${userRes.status} ${userRes.statusText}`);

    if (!userRes.ok) {
      let detail = `${userRes.status}`;
      try {
        const errBody = await userRes.json();
        detail = `${userRes.status} ${errBody.title || errBody.detail || userRes.statusText}`;
        console.error(`[xProvider] X API error body:`, JSON.stringify(errBody));
      } catch {}
      console.warn(`[xProvider] X API lookup failed (${detail}), falling back to mock`);
      return mockXProfile(username, detail);
    }

    const userData = await userRes.json();
    const user = userData.data;

    if (!user) {
      console.warn(`[xProvider] User not found in response, falling back to mock`);
      return mockXProfile(username, 'user_not_found');
    }

    const pm = user.public_metrics || {};
    console.log(`[xProvider] Raw public_metrics for @${username}:`, JSON.stringify(pm));

    // Fetch recent tweets for engagement + velocity
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${user.id}/tweets?max_results=20&tweet.fields=public_metrics,created_at`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    let avgEngPerPost = 0;
    let velocity7d = 0;

    if (tweetsRes.ok) {
      const tweetsData = await tweetsRes.json();
      const tweets = tweetsData.data || [];
      console.log(`[xProvider] Fetched ${tweets.length} tweets for engagement calc`);

      if (tweets.length > 0) {
        let totalEng = 0;
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        for (const tw of tweets) {
          const m = tw.public_metrics || {};
          totalEng += (m.like_count || 0) + (m.retweet_count || 0) +
                      (m.reply_count || 0) + (m.quote_count || 0);

          if (new Date(tw.created_at).getTime() >= sevenDaysAgo) {
            velocity7d++;
          }
        }

        avgEngPerPost = Math.round(totalEng / tweets.length);
      }
    } else {
      console.warn(`[xProvider] Tweets fetch failed: ${tweetsRes.status}`);
    }

    const kpis = {
      followers: pm.followers_count || 0,
      following: pm.following_count || 0,
      posts: pm.tweet_count || 0,
      listed: pm.listed_count || 0,
      avgEngPerPost,
      velocity7d,
    };
    console.log(`[xProvider] Final KPIs for @${username}:`, JSON.stringify(kpis));

    return {
      username: user.username || username,
      displayName: user.name || username,
      avatarUrl: user.profile_image_url?.replace('_normal', '_400x400') ||
                 `https://unavatar.io/x/${username}`,
      verified: user.verified || false,
      bio: user.description || '',
      kpis,
      source: 'x_api',
    };
  } catch (err) {
    console.error('[xProvider] X API error, falling back to mock:', err);
    return mockXProfile(username, `exception: ${err instanceof Error ? err.message : String(err)}`);
  }
}
