import type { KPIs, Score } from '../shared/types';
import { TIER_CONFIG, KPI_LABELS } from '../shared/constants';
import { formatNumber, shortId } from '../shared/score';

interface ScoreCardProps {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  capturedAt: string;
  snapshotId: string;
  kpis: KPIs;
  score: Score;
  tags?: string[];
  qrUrl?: string;
}

export default function ScoreCard(props: ScoreCardProps) {
  const { username, displayName, avatarUrl, capturedAt, snapshotId, kpis, score, tags = [], qrUrl } = props;
  const tier = TIER_CONFIG[score.tier];
  const cardId = shortId(snapshotId);
  const ts = new Date(capturedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  return (
    <div
      className="relative overflow-hidden rounded-[22px] border border-white/10"
      style={{
        width: 900,
        height: 560,
        background: `
          radial-gradient(1200px 800px at 30% 20%, rgba(255,255,255,0.06), transparent 60%),
          radial-gradient(900px 700px at 70% 80%, ${tier.glow}, transparent 60%),
          #07080B
        `,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: 'rgba(255,255,255,0.92)',
        padding: 24,
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -inset-20 pointer-events-none"
        style={{
          background: `linear-gradient(115deg, ${tier.glow}, transparent 35%), linear-gradient(45deg, rgba(255,255,255,0.04), transparent 45%)`,
        }}
      />

      {/* Foil shimmer */}
      {tags.includes('foil') && (
        <div className="absolute inset-0 rounded-[22px] pointer-events-none z-10" style={{
          background: 'linear-gradient(115deg, transparent 20%, rgba(255,215,0,0.08) 40%, rgba(255,255,255,0.12) 50%, rgba(255,215,0,0.08) 60%, transparent 80%)',
        }} />
      )}

      {/* Top pills */}
      <div className="relative z-2 flex justify-between items-center mb-3.5">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/18 bg-black/20 text-xs font-bold tracking-[0.22em] text-white/80">
          CREATOR
          {tags.map((t) => (
            <span
              key={t}
              className="ml-1 px-2 py-0.5 rounded-md text-[10px] font-black tracking-[0.2em] uppercase"
              style={{
                border: `1px solid ${t === 'foil' ? '#FFD700' : t === 'genesis' ? '#00FFAA' : 'rgba(255,255,255,0.2)'}`,
                background: t === 'foil' ? 'rgba(255,215,0,0.15)' : t === 'genesis' ? 'rgba(0,255,170,0.12)' : 'rgba(0,0,0,0.3)',
                color: t === 'foil' ? '#FFD700' : t === 'genesis' ? '#00FFAA' : 'rgba(255,255,255,0.7)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="px-4 py-2 rounded-xl border border-white/18 bg-black/20 text-xs font-bold tracking-[0.22em] text-white/80">
          SOCIAL SCORE
        </div>
      </div>

      {/* Left: avatar + identity */}
      <div className="relative z-2" style={{ width: 340 }}>
        <div className="w-[180px] h-[180px] rounded-2xl border border-white/16 bg-white/4 p-2 shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
          {avatarUrl ? (
            <img src={avatarUrl} alt={username} className="w-full h-full object-cover rounded-[14px]" />
          ) : (
            <div className="w-full h-full rounded-[14px] bg-white/6 flex items-center justify-center text-6xl font-black opacity-30">
              {username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="mt-4 text-[28px] font-extrabold tracking-[0.08em] uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[320px]">
          {displayName || username}
        </div>

        <div className="mt-2 w-fit px-3.5 py-2 rounded-xl border border-white/16 bg-black/22 text-xs font-bold tracking-[0.20em] text-white/72">
          @{username}
        </div>
      </div>

      {/* Right: score + tier */}
      <div className="absolute right-7 top-[90px] w-[420px] z-2 text-right">
        <div
          className="tracking-[0.26em] font-extrabold text-sm"
          style={{ color: tier.color, textShadow: `0 0 20px ${tier.glow}` }}
        >
          {tier.label}
        </div>
        <div className="text-[100px] font-black tracking-[0.06em] leading-none mt-1"
          style={{ textShadow: '0 8px 30px rgba(0,0,0,0.7)' }}>
          {score.value}
        </div>
        <div className="mt-2.5 tracking-[0.10em] text-[11px] opacity-65">
          {ts}
        </div>
      </div>

      {/* Bottom: 6 trait tiles */}
      <div className="absolute left-6 right-6 bottom-[68px] z-2 grid grid-cols-3 gap-2.5">
        {KPI_LABELS.map(({ key, label }) => (
          <div key={key} className="rounded-[14px] border border-white/14 bg-black/30 px-3.5 py-3">
            <div className="tracking-[0.20em] font-extrabold text-[10px] opacity-68 uppercase">
              {label}
            </div>
            <div className="mt-2 text-xl tracking-[0.06em] font-black">
              {formatNumber(kpis[key])}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="absolute left-6 right-6 bottom-[18px] z-2 flex justify-between items-center">
        <div className="tracking-[0.20em] font-extrabold text-[10px] opacity-72">
          CARD ID: {cardId}
        </div>
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="QR"
            className="w-12 h-12 rounded-lg border border-white/10 bg-black/20 p-0.5"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg border border-dashed border-white/14 opacity-40" />
        )}
      </div>
    </div>
  );
}
