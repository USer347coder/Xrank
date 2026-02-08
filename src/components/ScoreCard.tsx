import type { KPIs, Score } from '../shared/types';
import { TIER_CONFIG, KPI_LABELS } from '../shared/constants';
import { formatNumber, shortId } from '../shared/score';

interface ScoreCardProps {
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  capturedAt: string;
  snapshotId: string;
  kpis: KPIs;
  score: Score;
  tags?: string[];
  qrUrl?: string;
}

const TAG_LABELS: Record<string, string> = { genesis: '1ST ED.', foil: 'HOLO' };

export default function ScoreCard(props: ScoreCardProps) {
  const { username, displayName, bio, avatarUrl, capturedAt, snapshotId, kpis, score, tags = [], qrUrl } = props;
  const tier = TIER_CONFIG[score.tier];
  const cardId = shortId(snapshotId);
  const ts = new Date(capturedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  const truncBio = bio
    ? (bio.length > 120 ? bio.slice(0, 117) + '...' : bio)
    : '';

  return (
    <div
      className="relative rounded-[22px]"
      style={{
        width: 630,
        height: 880,
        padding: 3,
        background: `linear-gradient(160deg, ${tier.color}, ${tier.glow}, ${tier.color})`,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Inner card */}
      <div
        className="relative w-full h-full overflow-hidden rounded-[19px] flex flex-col"
        style={{
          background: `
            radial-gradient(800px 600px at 50% 20%, rgba(255,255,255,0.05), transparent 60%),
            radial-gradient(600px 500px at 50% 80%, ${tier.glow}, transparent 60%),
            #0A0C10
          `,
          color: 'rgba(255,255,255,0.92)',
          padding: '20px 24px',
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute -inset-16 pointer-events-none z-0"
          style={{
            background: `linear-gradient(160deg, ${tier.glow}, transparent 40%), linear-gradient(340deg, rgba(255,255,255,0.03), transparent 40%)`,
          }}
        />

        {/* Foil shimmer */}
        {tags.includes('foil') && (
          <div className="absolute inset-0 rounded-[18px] pointer-events-none z-10" style={{
            background: 'linear-gradient(135deg, transparent 15%, rgba(255,215,0,0.06) 30%, rgba(255,255,255,0.10) 45%, rgba(255,215,0,0.06) 60%, transparent 75%)',
          }} />
        )}

        {/* Top bar: Tier + Tags + Score */}
        <div className="relative z-2 flex justify-between items-center mb-4">
          <div className="flex items-center gap-1.5">
            <div
              className="px-3 py-1.5 rounded-lg text-[11px] font-black tracking-[0.20em]"
              style={{
                border: `1px solid ${tier.color}44`,
                background: tier.glow,
                color: tier.color,
                textShadow: `0 0 12px ${tier.glow}`,
              }}
            >
              {tier.label}
            </div>
            {tags.map((t) => (
              <span
                key={t}
                className="px-2 py-1 rounded-md text-[9px] font-black tracking-[0.18em] uppercase"
                style={{
                  border: `1px solid ${t === 'foil' ? '#FFD700' : t === 'genesis' ? '#00FFAA' : 'rgba(255,255,255,0.2)'}`,
                  background: t === 'foil' ? 'rgba(255,215,0,0.15)' : t === 'genesis' ? 'rgba(0,255,170,0.12)' : 'rgba(0,0,0,0.3)',
                  color: t === 'foil' ? '#FFD700' : t === 'genesis' ? '#00FFAA' : 'rgba(255,255,255,0.7)',
                }}
              >
                {TAG_LABELS[t] || t.toUpperCase()}
              </span>
            ))}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] font-bold tracking-[0.16em] opacity-50">SCORE</span>
            <span
              className="text-[32px] font-black tracking-[0.04em] leading-none"
              style={{
                color: tier.color,
                textShadow: `0 0 20px ${tier.glow}, 0 4px 12px rgba(0,0,0,0.5)`,
              }}
            >
              {score.value}
            </span>
          </div>
        </div>

        {/* Avatar (centered, circular) */}
        <div className="relative z-2 flex justify-center mb-3.5">
          <div
            className="w-[200px] h-[200px] rounded-full p-[5px]"
            style={{
              border: `3px solid ${tier.color}55`,
              background: 'rgba(255,255,255,0.04)',
              boxShadow: `0 0 30px ${tier.glow}, 0 16px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)`,
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={username} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full rounded-full bg-white/6 flex items-center justify-center text-7xl font-black opacity-30">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Name + Handle + Bio */}
        <div className="relative z-2 text-center mb-3.5">
          <div
            className="text-2xl font-black tracking-[0.06em] uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[560px] mx-auto"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
          >
            {displayName || username}
          </div>

          <div className="mt-1.5 inline-block px-3 py-1 rounded-lg border border-white/12 bg-black/25 text-[11px] font-bold tracking-[0.18em] text-white/60">
            @{username}
          </div>

          {truncBio && (
            <div className="mt-2.5 text-[11px] leading-relaxed opacity-50 italic max-w-[480px] mx-auto line-clamp-2">
              &ldquo;{truncBio}&rdquo;
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="relative z-2 h-px mx-2.5 mb-3.5"
          style={{
            background: `linear-gradient(90deg, transparent, ${tier.color}33, rgba(255,255,255,0.08), ${tier.color}33, transparent)`,
          }}
        />

        {/* 6 stat tiles (3x2) */}
        <div className="relative z-2 grid grid-cols-3 gap-2 mb-3.5 flex-grow">
          {KPI_LABELS.map(({ key, label }) => (
            <div key={key} className="rounded-[10px] border border-white/10 bg-black/35 px-2.5 py-2 text-center">
              <div className="tracking-[0.16em] font-extrabold text-[8px] opacity-55 uppercase mb-1">
                {label}
              </div>
              <div className="text-base tracking-[0.04em] font-black">
                {formatNumber(kpis[key])}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-2 flex justify-between items-center pt-2 border-t border-white/6">
          <div>
            <div className="text-[11px] font-black tracking-[0.14em] opacity-80 mb-0.5">
              ED. #{shortId(snapshotId) ? cardId : '1'}
            </div>
            <div className="tracking-[0.16em] font-bold text-[9px] opacity-45">
              {cardId} &middot; {ts}
            </div>
          </div>
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="QR"
              className="w-11 h-11 rounded-lg border border-white/8 bg-black/25 p-0.5"
            />
          ) : (
            <div className="w-11 h-11 rounded-lg border border-dashed border-white/10 opacity-40" />
          )}
        </div>
      </div>
    </div>
  );
}
