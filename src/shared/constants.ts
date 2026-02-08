import type { TierName } from './types.ts';

// ── Score weights ──
export const WEIGHTS = {
  influence: 0.35,
  credibility: 0.15,
  quality: 0.25,
  momentum: 0.15,
  healthN: 0.10,
} as const;

// ── Fixed normalization bounds ──
export const BOUNDS = {
  influence: { min: 0, max: 8 },     // log10(followers+1), max ~100M followers
  credibility: { min: 0, max: 5 },   // log10(listed+1), max ~100K listed
  quality: { min: 0, max: 6 },       // log10(avgEngPerPost+1), max ~1M eng
  momentum: { min: 0, max: 1 },      // min(velocity7d,100)/100
  healthN: { min: 0, max: 1 },       // clamp(followers/following, 0, 10)/10
} as const;

// ── Tier thresholds ──
export const TIER_THRESHOLDS: { min: number; max: number; name: TierName }[] = [
  { min: 90, max: 100, name: 'mythic' },
  { min: 75, max: 89, name: 'platinum' },
  { min: 50, max: 74, name: 'gold' },
  { min: 25, max: 49, name: 'silver' },
  { min: 0, max: 24, name: 'bronze' },
];

// ── Tier display config ──
export const TIER_CONFIG: Record<TierName, { label: string; color: string; glow: string }> = {
  mythic:   { label: 'MYTHIC',   color: '#FF00FF', glow: 'rgba(255,0,255,0.4)' },
  platinum: { label: 'PLATINUM', color: '#E5E4E2', glow: 'rgba(229,228,226,0.3)' },
  gold:     { label: 'GOLD',     color: '#FFD700', glow: 'rgba(255,215,0,0.3)' },
  silver:   { label: 'SILVER',   color: '#C0C0C0', glow: 'rgba(192,192,192,0.25)' },
  bronze:   { label: 'BRONZE',   color: '#CD7F32', glow: 'rgba(205,127,50,0.25)' },
};

// ── Card dimensions ──
export const CARD_WIDTH = 630;
export const CARD_HEIGHT = 880;

// ── KPI display order + labels ──
export const KPI_LABELS: { key: keyof import('./types.ts').KPIs; label: string }[] = [
  { key: 'followers', label: 'Followers' },
  { key: 'following', label: 'Following' },
  { key: 'posts', label: 'Total Posts' },
  { key: 'listed', label: 'Listed' },
  { key: 'avgEngPerPost', label: 'Avg Eng/Post' },
  { key: 'velocity7d', label: 'Velocity 7d' },
];
