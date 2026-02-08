import type { CaptureResult, CardAsset, Profile, Snapshot, LeaderboardItem, VaultCard } from '../shared/types';
import { supabase } from './supabase';

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function ensureOk(res: Response) {
  if (res.ok) return res;
  const parsed = await parseJsonSafe(res);
  const msg = (parsed as any)?.error || res.statusText || 'Request failed';
  throw new Error(msg);
}

// ── Auth helper ──
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (data.session?.access_token) {
    headers['Authorization'] = `Bearer ${data.session.access_token}`;
  }
  return headers;
}

// ── Capture ──
export async function captureSnapshot(username: string): Promise<CaptureResult> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/capture-snapshot', {
    method: 'POST',
    headers,
    body: JSON.stringify({ username }),
  });
  await ensureOk(res);
  return res.json();
}

// ── Card ──
export async function getCard(snapshotId: string): Promise<{
  profile: Profile;
  snapshot: Snapshot;
  assets: CardAsset[];
  cardId: string;
  qrUrl: string;
}> {
  const res = await fetch(`/api/card/${snapshotId}`);
  await ensureOk(res);
  return res.json();
}

// ── Assets ──
export async function getAssets(snapshotId: string): Promise<{ assets: CardAsset[] }> {
  const res = await fetch(`/api/assets/${snapshotId}`);
  await ensureOk(res);
  return res.json();
}

// ── Leaderboard ──
export async function getLeaderboard(
  days?: number,
  limit?: number
): Promise<{ items: LeaderboardItem[]; window?: { start: string; end: string; label: string }; limit?: number; total?: number }> {
  const qs =
    typeof days === 'number' && typeof limit === 'number'
      ? `?days=${days}&limit=${limit}`
      : '';
  const res = await fetch(`/api/leaderboard${qs}`);
  await ensureOk(res);
  return res.json();
}

export async function searchProfiles(q: string, limit = 12): Promise<{
  profiles: Array<Pick<Profile, 'username' | 'display_name' | 'avatar_url'>>;
}> {
  const res = await fetch(`/api/profiles?q=${encodeURIComponent(q)}&limit=${limit}`);
  await ensureOk(res);
  return res.json();
}

// ── Vault ──
export async function saveToVault(
  snapshotId: string,
  visibility: 'public' | 'private' | 'unlisted'
): Promise<{ ok: boolean; vaultEntry?: unknown; error?: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/save-to-vault', {
    method: 'POST',
    headers,
    body: JSON.stringify({ snapshotId, visibility }),
  });
  await ensureOk(res);
  return res.json();
}

export async function getMyVault(): Promise<{ cards: VaultCard[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/my-vault', { headers });
  await ensureOk(res);
  return res.json();
}

export async function getVaultByUsername(
  username: string
): Promise<{ profile: Profile; cards: VaultCard[] }> {
  const res = await fetch(`/api/vault/${encodeURIComponent(username)}`);
  await ensureOk(res);
  return res.json();
}
