import { Link } from 'react-router-dom';
import type { VaultCard } from '../shared/types';
import { TIER_CONFIG } from '../shared/constants';
import type { TierName } from '../shared/types';

export default function CardThumb({ card }: { card: VaultCard }) {
  const pngUrl = card.assets.find((a) => a.format === 'png')?.url;
  const score = card.snapshot?.score;
  const tier = score?.tier as TierName | undefined;
  const tierCfg = tier ? TIER_CONFIG[tier] : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 overflow-hidden group hover:border-white/20 transition">
      <Link to={`/card/${card.snapshot.id}`} className="block">
        <div className="aspect-[16/10] bg-white/[0.03] relative overflow-hidden">
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

      <div className="p-3.5 flex justify-between items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            {score && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-black tracking-[0.16em]"
                style={{
                  borderColor: tierCfg?.color ?? 'rgba(255,255,255,0.15)',
                  color: tierCfg?.color ?? 'white',
                  background: `${tierCfg?.glow ?? 'rgba(255,255,255,0.05)'}`,
                }}
              >
                {score.value}
              </span>
            )}
            {card.profile && (
              <span className="text-xs opacity-60 font-mono">@{card.profile.username}</span>
            )}
          </div>
          <div className="text-[11px] font-mono opacity-50 mt-1.5">
            {new Date(card.snapshot.captured_at).toISOString().replace('T', ' ').slice(0, 16)} UTC
          </div>
        </div>

        {card.vaultEntry && (
          <span className="text-[10px] font-bold tracking-[0.16em] opacity-50 uppercase">
            {card.vaultEntry.visibility}
          </span>
        )}
      </div>
    </div>
  );
}
