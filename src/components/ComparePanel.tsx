import { Link } from 'react-router-dom';
import type { VaultCard } from '../shared/types';
import { KPI_LABELS, TIER_CONFIG } from '../shared/constants';
import { formatNumber } from '../shared/score';
import type { TierName } from '../shared/types';

interface ComparePanelProps {
  label: string;
  card: VaultCard;
}

export default function ComparePanel({ label, card }: ComparePanelProps) {
  const snap = card.snapshot;
  const kpis = snap.kpis;
  const tier = TIER_CONFIG[snap.score.tier as TierName];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
      <div className="flex justify-between items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 text-xs font-black tracking-[0.16em]">
            {label}
          </span>
          <span
            className="px-2.5 py-1 rounded-lg border text-xs font-black tracking-[0.16em]"
            style={{ borderColor: tier.color, color: tier.color }}
          >
            {snap.score.value}
          </span>
        </div>
        <Link
          to={`/card/${snap.id}`}
          className="text-xs font-bold tracking-[0.14em] opacity-60 hover:opacity-100 transition"
        >
          OPEN &rarr;
        </Link>
      </div>

      <div className="text-[11px] font-mono opacity-50 mb-4">
        {new Date(snap.captured_at).toISOString().replace('T', ' ').slice(0, 16)} UTC
      </div>

      <div className="border-t border-white/8 pt-3 space-y-2.5">
        {KPI_LABELS.map(({ key, label: lbl }) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-[11px] font-bold tracking-[0.18em] opacity-60 uppercase">
              {lbl}
            </span>
            <span className="font-mono font-black tracking-[0.06em] text-sm">
              {formatNumber(kpis[key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
