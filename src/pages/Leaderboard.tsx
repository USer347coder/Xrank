import { useEffect, useState } from 'react';
import { getLeaderboard } from '../lib/api';
import CardThumb from '../components/CardThumb';
import type { LeaderboardItem, VaultCard } from '../shared/types';

export default function Leaderboard() {
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [days, setDays] = useState(7);
  const [limit, setLimit] = useState(24);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getLeaderboard(days, limit);
      setItems(res.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [days, limit]);

  // Convert LeaderboardItem → VaultCard for CardThumb
  const cards: VaultCard[] = items.map((it) => ({
    snapshot: it.snapshot,
    profile: it.profile,
    assets: it.assets,
    vaultEntry: { id: '', visibility: 'public' as const, tags: [], created_at: it.snapshot.captured_at },
  }));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-bold tracking-[0.18em] opacity-90">LEADERBOARD</div>
            <div className="text-xs opacity-50 mt-0.5">Top Social Scores by time window</div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="px-3 py-2 rounded-xl border border-white/15 bg-black/30 text-xs text-white outline-none"
            >
              <option value={1}>Last 24h</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>

            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="px-3 py-2 rounded-xl border border-white/15 bg-black/30 text-xs text-white outline-none"
            >
              <option value={12}>Top 12</option>
              <option value={24}>Top 24</option>
              <option value={48}>Top 48</option>
            </select>

            <button
              onClick={load}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition disabled:opacity-40"
            >
              {loading ? 'LOADING...' : 'REFRESH'}
            </button>

            <span className="text-xs font-mono opacity-50">{items.length} items</span>
          </div>
        </div>

        {items.length === 0 && !loading ? (
          <div className="text-xs opacity-40 py-8 text-center">
            No snapshots in this window. Capture a few cards first.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it, i) => (
              <div key={it.snapshot.id}>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 text-[10px] font-black tracking-[0.16em]">
                    #{it.rank}
                  </span>
                  <span className="text-xs font-mono opacity-50">
                    @{it.profile?.username || 'unknown'}
                  </span>
                </div>
                <CardThumb card={cards[i]} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
