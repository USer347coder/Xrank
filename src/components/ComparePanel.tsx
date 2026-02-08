import type { VaultCard, TierName } from '../shared/types';
import { TIER_CONFIG, KPI_LABELS } from '../shared/constants';
import { formatNumber } from '../shared/score';

export default function ComparePanel({ label, card }: { label: string; card: VaultCard }) {
  const score = card.snapshot?.score;
  const tier = score?.tier as TierName | undefined;
  const tierCfg = tier ? TIER_CONFIG[tier] : null;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-lg border border-white/20 bg-white/5 text-[10px] font-black tracking-[0.16em]">
          {label}
        </span>
        {score && (
          <span
            className="px-2.5 py-1 rounded-lg border text-[11px] font-black tracking-[0.16em]"
            style={{ borderColor: tierCfg?.color, color: tierCfg?.color, background: tierCfg?.glow }}
          >
            {score.value}
          </span>
        )}
      </div>

      <div className="text-[11px] font-mono opacity-50">
        {new Date(card.snapshot.captured_at).toISOString().replace('T', ' ').slice(0, 16)} UTC
      </div>

      <div className="space-y-1.5">
        {KPI_LABELS.map(({ key, label: kLabel }) => (
          <div key={key} className="flex justify-between items-center">
            <span className="text-[10px] font-bold tracking-[0.16em] opacity-50 uppercase">{kLabel}</span>
            <span className="font-mono font-black text-xs">{formatNumber(card.snapshot.kpis[key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
