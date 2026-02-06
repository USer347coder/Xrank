import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getVaultByUsername } from '../lib/api';
import CardThumb from '../components/CardThumb';
import ComparePanel from '../components/ComparePanel';
import type { VaultCard, Profile } from '../shared/types';

export default function PublicVault() {
  const { username } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cards, setCards] = useState<VaultCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  async function load() {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getVaultByUsername(username.replace(/^@/, ''));
      if ((res as any).error) {
        setError((res as any).error);
        return;
      }
      setProfile(res.profile || null);
      setCards(res.cards || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [username]);

  const cardMap = useMemo(() => new Map(cards.map((c) => [c.snapshot.id, c])), [cards]);
  const cardA = compareA ? cardMap.get(compareA) : null;
  const cardB = compareB ? cardMap.get(compareB) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-10 h-10 rounded-xl border border-white/10"
              />
            )}
            <div>
              <div className="text-xs font-bold tracking-[0.18em] opacity-90">
                PUBLIC VAULT @{(profile?.username || username || '').replace(/^@/, '').toUpperCase()}
              </div>
              <div className="text-xs opacity-50 mt-0.5">Timeline &middot; Compare</div>
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
            <span className="text-xs font-mono opacity-50">{cards.length} snapshots</span>
          </div>
        </div>

        {error && (
          <div className="text-xs font-mono text-red-400 mb-3">{error}</div>
        )}

        {cards.length === 0 && !loading ? (
          <div className="text-xs opacity-40 py-8 text-center">
            No snapshots for this username yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c) => (
              <div key={c.snapshot.id}>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setCompareA(c.snapshot.id)}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold tracking-[0.14em] transition ${
                      compareA === c.snapshot.id
                        ? 'border-white/30 bg-white/10'
                        : 'border-white/10 bg-white/[0.03] opacity-60 hover:opacity-100'
                    }`}
                  >
                    SET A
                  </button>
                  <button
                    onClick={() => setCompareB(c.snapshot.id)}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold tracking-[0.14em] transition ${
                      compareB === c.snapshot.id
                        ? 'border-white/30 bg-white/10'
                        : 'border-white/10 bg-white/[0.03] opacity-60 hover:opacity-100'
                    }`}
                  >
                    SET B
                  </button>
                </div>
                <CardThumb card={c} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compare */}
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="text-xs font-bold tracking-[0.18em] opacity-90 mb-1">COMPARE</div>
        <div className="text-xs opacity-50 mb-4">Select two snapshots (A and B) above to compare</div>

        {cardA && cardB ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <ComparePanel label="A" card={cardA} />
            <ComparePanel label="B" card={cardB} />
          </div>
        ) : (
          <div className="text-xs opacity-30 py-6 text-center">
            Choose two cards above to compare side-by-side.
          </div>
        )}
      </div>
    </div>
  );
}
