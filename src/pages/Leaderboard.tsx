import { useEffect, useState } from 'react';
import { getLeaderboard } from '../lib/api';
import type { LeaderboardItem } from '../shared/types';
import { TIER_CONFIG } from '../shared/constants';
import type { TierName } from '../shared/types';
import { Link } from 'react-router-dom';

const SCORE_COMPONENTS = [
  { name: 'INFLUENCE', weight: '35%', desc: 'Follower reach (log scale)' },
  { name: 'QUALITY', weight: '25%', desc: 'Average engagement per post' },
  { name: 'CREDIBILITY', weight: '15%', desc: 'How often you\'re listed by others' },
  { name: 'MOMENTUM', weight: '15%', desc: 'Posts in the last 7 days' },
  { name: 'HEALTH', weight: '10%', desc: 'Follower-to-following ratio' },
];

const COMING_SOON = [
  { icon: '\u{1F4C8}', title: 'Score Tracking', desc: 'Watch how scores evolve over time' },
  { icon: '\u2694\uFE0F', title: 'Head-to-Head', desc: 'Compare two cards side by side' },
  { icon: '\u{1F3C6}', title: 'Achievements', desc: 'Unlock badges for milestones' },
  { icon: '\u{1F5C3}\uFE0F', title: 'Card Vault', desc: 'Save & collect your favorite editions' },
  { icon: '\u{1F48E}', title: 'Card Trading', desc: 'Trade rare editions with others' },
];

export default function Leaderboard() {
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [windowLabel, setWindowLabel] = useState<string>('previous_month');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getLeaderboard();
      setItems(res.items || []);
      setWindowLabel(res.window?.label || 'previous_month');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-5">
      {/* Header + Controls */}
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-bold tracking-[0.18em] opacity-90">RANKING BOARD</div>
            <div className="text-xs opacity-50 mt-0.5">
              {windowLabel === 'current_month_so_far'
                ? 'Top 100 this month so far'
                : 'Top 100 from last month'}{' '}
              &middot; Updates monthly
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition disabled:opacity-40"
            >
              {loading ? 'LOADING...' : 'REFRESH'}
            </button>

            <span className="text-xs font-mono opacity-50">{items.length} editions</span>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="rounded-xl border border-white/8 bg-black/20 p-4 mb-5">
          <div className="text-[10px] font-bold tracking-[0.18em] opacity-60 mb-3">HOW SCORING WORKS</div>
          <div className="text-xs opacity-50 mb-3">
            Your Social Score (0&ndash;100) is computed from 5 weighted signals:
          </div>
          <div className="grid sm:grid-cols-5 gap-2 mb-3">
            {SCORE_COMPONENTS.map((c) => (
              <div key={c.name} className="rounded-lg border border-white/8 bg-white/[0.03] p-2.5">
                <div className="text-[10px] font-black tracking-[0.16em] opacity-80">{c.name}</div>
                <div className="text-sm font-black tracking-[0.06em] mt-1 opacity-90">{c.weight}</div>
                <div className="text-[10px] opacity-40 mt-1 leading-tight">{c.desc}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] opacity-50 tracking-wider">
            Tiers:{' '}
            <span style={{ color: TIER_CONFIG.mythic.color }}>MYTHIC (90+)</span>{' '}
            <span className="opacity-30">&middot;</span>{' '}
            <span style={{ color: TIER_CONFIG.platinum.color }}>PLATINUM (75+)</span>{' '}
            <span className="opacity-30">&middot;</span>{' '}
            <span style={{ color: TIER_CONFIG.gold.color }}>GOLD (50+)</span>{' '}
            <span className="opacity-30">&middot;</span>{' '}
            <span style={{ color: TIER_CONFIG.silver.color }}>SILVER (25+)</span>{' '}
            <span className="opacity-30">&middot;</span>{' '}
            <span style={{ color: TIER_CONFIG.bronze.color }}>BRONZE (0+)</span>
          </div>
        </div>

        {/* Card Grid */}
        {items.length === 0 && !loading ? (
          <div className="text-xs opacity-40 py-8 text-center">
            No editions minted in this window. Mint some cards first.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => {
              const tier = it.snapshot?.score?.tier as TierName | undefined;
              const tierCfg = tier ? TIER_CONFIG[tier] : null;
              const pngUrl = it.assets?.find((a) => a.format === 'png')?.url;

              return (
                <div key={it.snapshot.id} className="rounded-2xl border border-white/10 bg-black/25 overflow-hidden group hover:border-white/20 transition">
                  <Link to={`/card/${it.snapshot.id}`} className="block">
                    <div className="aspect-[5/7] bg-white/[0.03] relative overflow-hidden">
                      {pngUrl ? (
                        <img
                          src={pngUrl}
                          alt="card"
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs opacity-40 tracking-wider font-bold">
                          RENDERING...
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 text-[10px] font-black tracking-[0.16em]">
                          {it.rank}/{it.total}
                        </span>
                        {it.snapshot?.score && (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-black tracking-[0.16em]"
                            style={{
                              borderColor: tierCfg?.color ?? 'rgba(255,255,255,0.15)',
                              color: tierCfg?.color ?? 'white',
                              background: tierCfg?.glow ?? 'rgba(255,255,255,0.05)',
                            }}
                          >
                            {it.snapshot.score.value}
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-1 rounded-lg border border-white/10 bg-white/[0.03] text-[10px] font-black tracking-[0.16em] opacity-60">
                        ED. #{it.snapshot.card_number}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs opacity-60 font-mono">
                        @{it.profile?.username || 'unknown'}
                      </span>
                      <span className="text-[11px] font-mono opacity-50">
                        {new Date(it.snapshot.captured_at).toISOString().replace('T', ' ').slice(0, 16)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Coming Soon Teaser */}
      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5">
        <div className="text-xs font-bold tracking-[0.18em] opacity-70 mb-1">COMING SOON</div>
        <div className="text-xs opacity-40 mb-4">New features on the roadmap</div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {COMING_SOON.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5 hover:bg-white/[0.04] transition"
            >
              <div className="text-xl mb-2">{item.icon}</div>
              <div className="text-[11px] font-bold tracking-[0.14em] opacity-80 mb-1">{item.title}</div>
              <div className="text-[10px] opacity-40 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
