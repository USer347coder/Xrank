import type { KPIs, Score, SubScores, TierName } from './types.ts';
import { WEIGHTS, BOUNDS, TIER_THRESHOLDS } from './constants.ts';

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function computeSubScores(k: KPIs): SubScores {
  const influence = Math.log10(k.followers + 1);
  const credibility = Math.log10(k.listed + 1);
  const quality = Math.log10(k.avgEngPerPost + 1);
  const momentum = clamp(k.velocity7d, 0, 100) / 100;
  const healthN = clamp(k.followers / Math.max(k.following, 1), 0, 10) / 10;

  const raw =
    WEIGHTS.influence * influence +
    WEIGHTS.credibility * credibility +
    WEIGHTS.quality * quality +
    WEIGHTS.momentum * momentum +
    WEIGHTS.healthN * healthN;

  return { influence, credibility, quality, momentum, healthN, raw };
}

export function normalizeRaw(raw: number): number {
  const rawMin =
    WEIGHTS.influence * BOUNDS.influence.min +
    WEIGHTS.credibility * BOUNDS.credibility.min +
    WEIGHTS.quality * BOUNDS.quality.min +
    WEIGHTS.momentum * BOUNDS.momentum.min +
    WEIGHTS.healthN * BOUNDS.healthN.min;

  const rawMax =
    WEIGHTS.influence * BOUNDS.influence.max +
    WEIGHTS.credibility * BOUNDS.credibility.max +
    WEIGHTS.quality * BOUNDS.quality.max +
    WEIGHTS.momentum * BOUNDS.momentum.max +
    WEIGHTS.healthN * BOUNDS.healthN.max;

  return clamp((raw - rawMin) / (rawMax - rawMin), 0, 1);
}

export function assignTier(value: number): TierName {
  for (const t of TIER_THRESHOLDS) {
    if (value >= t.min) return t.name;
  }
  return 'bronze';
}

export function socialScoreV1(kpis: KPIs): Score {
  const sub = computeSubScores(kpis);
  const normalized = normalizeRaw(sub.raw);
  const value = Math.round(normalized * 100);
  const tier = assignTier(value);
  return { value, tier, formulaVersion: 'v1' };
}

/** Determine tags for a snapshot */
export function computeTags(
  score: Score,
  previousScore: number | null,
  isFirstSnapshot: boolean,
  capturedAt: Date
): string[] {
  const tags: string[] = [];

  if (isFirstSnapshot) {
    tags.push('genesis');
  }

  // "foil" if score increased >=10 vs previous, OR captured at month-end (UTC)
  const scoreDelta = previousScore !== null ? score.value - previousScore : 0;
  if (scoreDelta >= 10) {
    tags.push('foil');
  }

  // month-end: check if next day is a different month
  const nextDay = new Date(capturedAt);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  if (nextDay.getUTCMonth() !== capturedAt.getUTCMonth()) {
    if (!tags.includes('foil')) tags.push('foil');
  }

  return tags;
}

/** Format large numbers for display */
export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

/** Short ID from UUID */
export function shortId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 10).toUpperCase();
}
