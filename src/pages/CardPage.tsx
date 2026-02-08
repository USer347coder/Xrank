import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCard, getAssets } from '../lib/api';
import type { Profile, Snapshot, CardAsset } from '../shared/types';
import { TIER_CONFIG, KPI_LABELS } from '../shared/constants';
import { formatNumber, shortId } from '../shared/score';
import type { TierName } from '../shared/types';

function buildTweetText(username: string, score: number, tier: string, cardNumber: number, cardUrl: string) {
  return [
    `\u{1F3B4} Just minted a ${tier.toUpperCase()} Social Score Card!`,
    '',
    `@${username} \u00B7 Score ${score}/100 \u00B7 Edition #${cardNumber}`,
    '',
    `Mint yours \u2192 ${cardUrl}`,
    '',
    '#SocialScore #XRank',
  ].join('\n');
}

export default function CardPage() {
  const { snapshotId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [assets, setAssets] = useState<CardAsset[]>([]);
  const [cardId, setCardId] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!snapshotId) return;
    setLoading(true);
    Promise.all([getCard(snapshotId), getAssets(snapshotId)])
      .then(([cardRes, assetsRes]) => {
        if ((cardRes as any).error) {
          setError((cardRes as any).error);
          return;
        }
        setProfile(cardRes.profile);
        setSnapshot(cardRes.snapshot);
        setCardId(cardRes.cardId);
        setQrUrl(cardRes.qrUrl);
        setAssets([...(cardRes.assets || []), ...(assetsRes.assets || [])]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [snapshotId]);

  const pngUrl = useMemo(() => assets.find((a) => a.format === 'png')?.url, [assets]);
  const pdfUrl = useMemo(() => assets.find((a) => a.format === 'pdf')?.url, [assets]);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const tier = snapshot?.score?.tier as TierName | undefined;
  const tierCfg = tier ? TIER_CONFIG[tier] : null;

  function shareOnX() {
    if (!snapshot || !profile) return;
    const text = buildTweetText(
      profile.username,
      snapshot.score.value,
      snapshot.score.tier,
      snapshot.card_number,
      shareUrl,
    );
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xs font-bold tracking-[0.16em] opacity-40 animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (error || !snapshot || !profile) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/25 p-8 text-center">
        <div className="text-xs font-mono text-red-400">{error || 'Card not found'}</div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Left: Card info */}
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5 space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="px-3 py-1.5 rounded-lg border text-xs font-black tracking-[0.16em]"
            style={{ borderColor: tierCfg?.color, color: tierCfg?.color, background: tierCfg?.glow }}
          >
            SCORE {snapshot.score.value}
          </span>
          <span
            className="px-3 py-1.5 rounded-lg border text-xs font-black tracking-[0.16em]"
            style={{ borderColor: tierCfg?.color, color: tierCfg?.color }}
          >
            {tierCfg?.label}
          </span>
          <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 text-[10px] font-black tracking-[0.16em]">
            EDITION #{snapshot.card_number}
          </span>
          <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 text-[10px] font-black tracking-[0.16em]">
            ID {cardId}
          </span>
          {(() => {
            const src = (snapshot.provenance as any)?.source;
            const isMock = src === 'mock';
            const isCached = src === 'cached';
            const color = isMock ? '#FF6B35' : isCached ? '#00AAFF' : '#00FF88';
            const label = isMock ? 'MOCK DATA' : isCached ? 'CACHED DATA' : 'LIVE DATA';
            return (
              <span
                className="px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-[0.16em]"
                style={{
                  borderColor: color,
                  color: color,
                  background: `${color}14`,
                }}
              >
                {label}
              </span>
            );
          })()}
        </div>

        <div className="text-sm font-mono opacity-70">@{profile.username}</div>
        <div className="text-[11px] font-mono opacity-50">
          Minted: {new Date(snapshot.captured_at).toISOString().replace('T', ' ').slice(0, 16)} UTC
        </div>

        {/* KPIs */}
        <div className="border-t border-white/8 pt-3 space-y-2">
          {KPI_LABELS.map(({ key, label }) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-[11px] font-bold tracking-[0.18em] opacity-60 uppercase">{label}</span>
              <span className="font-mono font-black tracking-[0.06em] text-sm">
                {formatNumber(snapshot.kpis[key])}
              </span>
            </div>
          ))}
        </div>

        {/* Share */}
        <div className="border-t border-white/8 pt-3">
          <div className="text-[10px] font-bold tracking-[0.16em] opacity-50 mb-2">SHARE</div>
          <div className="text-xs font-mono opacity-60 break-all mb-3">{shareUrl}</div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition"
            >
              COPY LINK
            </button>
            <button
              onClick={shareOnX}
              className="px-3.5 py-2 rounded-xl border border-white/25 bg-white/10 text-xs font-bold tracking-[0.14em] hover:bg-white/20 transition"
            >
              SHARE ON X
            </button>
          </div>
        </div>

        {/* Downloads */}
        <div className="border-t border-white/8 pt-3 flex gap-2 flex-wrap">
          <a
            href={pngUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className={`px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition ${!pngUrl ? 'opacity-40 pointer-events-none' : ''}`}
          >
            DOWNLOAD PNG
          </a>
          <a
            href={pdfUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className={`px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition ${!pdfUrl ? 'opacity-40 pointer-events-none' : ''}`}
          >
            DOWNLOAD PDF
          </a>
        </div>
      </div>

      {/* Right: Preview + QR */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="text-xs font-bold tracking-[0.18em] opacity-90 mb-3">YOUR CARD</div>
          {pngUrl ? (
            <img src={pngUrl} alt="Card" className="w-full rounded-2xl border border-white/10" />
          ) : (
            <div className="aspect-[5/7] rounded-2xl border border-dashed border-white/8 flex items-center justify-center text-xs opacity-30">
              No PNG available
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="text-xs font-bold tracking-[0.18em] opacity-90 mb-3">QR CODE</div>
          <div className="text-xs opacity-50 mb-3">Points to this card page</div>
          {qrUrl && (
            <img src={qrUrl} alt="QR" className="w-36 h-36 rounded-2xl border border-white/10" />
          )}
        </div>
      </div>
    </div>
  );
}
