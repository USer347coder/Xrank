// ── KPIs ──
export interface KPIs {
  followers: number;
  following: number;
  posts: number;
  listed: number;
  avgEngPerPost: number;
  velocity7d: number;
}

// ── Score ──
export type TierName = 'bronze' | 'silver' | 'gold' | 'platinum' | 'mythic';

export interface Score {
  value: number;       // 0–100
  tier: TierName;
  formulaVersion: 'v1';
}

export interface SubScores {
  influence: number;
  credibility: number;
  quality: number;
  momentum: number;
  healthN: number;
  raw: number;
}

// ── DB row types ──
export interface Profile {
  id: string;
  platform: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean | null;
  created_at: string;
  last_fetched_at: string | null;
}

export interface Snapshot {
  id: string;
  profile_id: string;
  captured_at: string;
  kpis: KPIs;
  score: Score;
  provenance: Record<string, unknown>;
  created_at: string;
}

export interface CardAsset {
  id: string;
  snapshot_id: string;
  format: 'png' | 'pdf';
  url: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface VaultEntry {
  id: string;
  owner_user_id: string;
  snapshot_id: string;
  visibility: 'public' | 'private' | 'unlisted';
  tags: string[];
  created_at: string;
}

// ── API response shapes ──
export interface CaptureResult {
  profile: Profile;
  snapshot: Snapshot;
  assets: CardAsset[];
  tags: string[];
}

export interface VaultCard {
  vaultEntry: Pick<VaultEntry, 'id' | 'visibility' | 'tags' | 'created_at'>;
  snapshot: Snapshot;
  profile?: Profile;
  assets: CardAsset[];
}

export interface LeaderboardItem {
  rank: number;
  snapshot: Snapshot;
  profile: Profile;
  assets: CardAsset[];
}
