import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getMyVault } from '../lib/api';
import AuthForm from '../components/AuthForm';
import CardThumb from '../components/CardThumb';
import type { VaultCard, TierName } from '../shared/types';

export default function MyVault() {
  const { user, loading: authLoading } = useAuth();
  const [cards, setCards] = useState<VaultCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState('all');

  async function load() {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getMyVault();
      setCards(res.cards || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  const filtered = useMemo(() => {
    if (tier === 'all') return cards;
    return cards.filter((c) => c.snapshot?.score?.tier === tier);
  }, [cards, tier]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xs font-bold tracking-[0.16em] opacity-40 animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto space-y-5">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-center">
          <div className="text-xs font-bold tracking-[0.18em] opacity-70 mb-2">MY VAULT</div>
          <div className="text-xs opacity-50">Login to view your saved cards.</div>
        </div>
        <AuthForm onAuthed={load} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-bold tracking-[0.18em] opacity-90">MY VAULT</div>
            <div className="text-xs opacity-50 mt-1">Your saved cards (public/private/unlisted)</div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="px-3 py-2 rounded-xl border border-white/15 bg-black/30 text-xs text-white outline-none"
            >
              <option value="all">All Tiers</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
              <option value="mythic">Mythic</option>
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition disabled:opacity-40"
            >
              {loading ? 'LOADING...' : 'REFRESH'}
            </button>
            <span className="text-xs font-mono opacity-50">{filtered.length} cards</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-xs opacity-40 py-8 text-center">
            No cards yet. Capture a snapshot on the home page and save it here.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <CardThumb key={c.snapshot.id} card={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
