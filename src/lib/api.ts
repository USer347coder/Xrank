import { supabase } from './supabase';
import type { CaptureResult, VaultCard, LeaderboardItem, CardAsset, Profile, Snapshot } from '../shared/types';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
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
  return res.json();
}

// ── Assets ──
export async function getAssets(snapshotId: string): Promise<{ assets: CardAsset[] }> {
  const res = await fetch(`/api/assets/${snapshotId}`);
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
  return res.json();
}

export async function getMyVault(): Promise<{ cards: VaultCard[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/my-vault', { headers });
  return res.json();
}

export async function getVaultByUsername(
  username: string
): Promise<{ profile: Profile; cards: VaultCard[] }> {
  const res = await fetch(`/api/vault/${encodeURIComponent(username)}`);
  return res.json();
}

// ── Leaderboard ──
export async function getLeaderboard(
  days = 7,
  limit = 24
): Promise<{ items: LeaderboardItem[] }> {
  const res = await fetch(`/api/leaderboard?days=${days}&limit=${limit}`);
  return res.json();
}
