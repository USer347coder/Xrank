import type { Config } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseAdmin.mts';
import { corsResponse, errorResponse, jsonResponse } from '../lib/response.mts';

export const config: Config = {
  path: '/api/profiles',
  method: ['GET', 'OPTIONS'],
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const url = new URL(req.url);
    const qRaw = url.searchParams.get('q') || '';
    const q = qRaw.trim().replace(/^@/, '').toLowerCase();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '12', 10), 25);

    if (!q) return jsonResponse({ profiles: [] });

    // Broad match for quick discovery; keep results small.
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('platform', 'x')
      .ilike('username', `%${q}%`)
      .order('username', { ascending: true })
      .limit(limit);

    if (error) return errorResponse(error.message);

    return jsonResponse({ profiles: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse(msg);
  }
};

