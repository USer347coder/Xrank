import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { captureSnapshot, getAssets } from '../lib/api';
import type { CaptureResult, CardAsset } from '../shared/types';
import { TIER_CONFIG } from '../shared/constants';
import type { TierName } from '../shared/types';

const TAG_DISPLAY: Record<string, { label: string; color: string }> = {
  genesis: { label: 'FIRST EDITION', color: '#00FFAA' },
  foil: { label: 'HOLOGRAPHIC', color: '#FFD700' },
};

function buildTweetText(username: string, score: number, tier: string, cardNumber: number, snapshotId: string) {
  const cardUrl = `${window.location.origin}/card/${snapshotId}`;
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

export default function Home() {
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<CaptureResult | null>(null);
  const [assets, setAssets] = useState<CardAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const cancelled = useRef(false);

  const pngUrl = useMemo(() => assets.find((a) => a.format === 'png')?.url, [assets]);
  const pdfUrl = useMemo(() => assets.find((a) => a.format === 'pdf')?.url, [assets]);

  useEffect(() => {
    return () => {
      cancelled.current = true;
    };
  }, []);

  // Poll for assets after capture (card renders in background)
  const pollAssets = useCallback(async (snapshotId: string) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 20;
    const interval = 2000;

    const poll = async () => {
      attempts++;
      try {
        const res = await getAssets(snapshotId);
        if (res.assets && res.assets.length > 0) {
          if (!cancelled.current) {
            setAssets(res.assets);
            setPolling(false);
          }
          return;
        }
      } catch {}

      if (attempts < maxAttempts) {
        setTimeout(poll, interval);
      } else {
        if (!cancelled.current) setPolling(false);
      }
    };

    setTimeout(poll, 3000);
  }, []);

  async function onCapture() {
    setError(null);
    setBusy(true);
    setData(null);
    setAssets([]);

    try {
      const res = await captureSnapshot(username);
      if ((res as any).error) {
        setError((res as any).error);
        return;
      }
      setData(res);
      // If assets came back immediately, use them
      if (res.assets && res.assets.length > 0) {
        setAssets(res.assets);
      } else if (res.snapshot?.id) {
        // Poll for background render
        pollAssets(res.snapshot.id);
      }
    } catch (e: any) {
      setError(e.message || 'Capture failed');
    } finally {
      setBusy(false);
    }
  }

  const tier = data?.snapshot?.score?.tier as TierName | undefined;
  const tierCfg = tier ? TIER_CONFIG[tier] : null;

  function shareOnX() {
    if (!data?.snapshot || !data?.profile) return;
    const text = buildTweetText(
      data.profile.username,
      data.snapshot.score.value,
      data.snapshot.score.tier,
      data.snapshot.card_number,
      data.snapshot.id,
    );
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Left: Mint */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="text-xs font-bold tracking-[0.18em] opacity-90 mb-1">MINT</div>
          <div className="text-xs opacity-50 mb-4">
            Enter an X handle &rarr; mint a scored collectible card
          </div>

          <div className="space-y-3">
            <input
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCapture()}
              className="w-full px-4 py-3 rounded-xl border border-white/15 bg-black/30 text-white text-sm outline-none focus:border-white/30 transition placeholder:opacity-40"
            />
            <button
              onClick={onCapture}
              disabled={busy || username.trim().length < 2}
              className="w-full px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.16em] hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'MINTING...' : 'MINT CARD'}
            </button>
          </div>

          {error && (
            <div className="mt-3 text-xs font-mono text-red-400 opacity-80">{error}</div>
          )}

          {data?.snapshot && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="px-3 py-1.5 rounded-lg border text-xs font-black tracking-[0.16em]"
                  style={{
                    borderColor: tierCfg?.color,
                    color: tierCfg?.color,
                    background: tierCfg?.glow,
                  }}
                >
                  SCORE {data.snapshot.score.value}
                </span>
                <span
                  className="px-3 py-1.5 rounded-lg border text-xs font-black tracking-[0.16em]"
                  style={{
                    borderColor: tierCfg?.color,
                    color: tierCfg?.color,
                  }}
                >
                  {tierCfg?.label}
                </span>
                <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 text-[10px] font-black tracking-[0.16em]">
                  EDITION #{data.snapshot.card_number}
                </span>
                {data.tags.map((t) => {
                  const display = TAG_DISPLAY[t] || { label: t.toUpperCase(), color: 'rgba(255,255,255,0.6)' };
                  return (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-[0.16em]"
                      style={{
                        borderColor: display.color,
                        color: display.color,
                      }}
                    >
                      {display.label}
                    </span>
                  );
                })}
              </div>

              {/* Data source + Snapshot info */}
              {(() => {
                const src = (data.snapshot.provenance as any)?.source;
                const isMock = src === 'mock';
                const isCached = src === 'cached';
                const color = isMock ? '#FF6B35' : isCached ? '#00AAFF' : '#00FF88';
                const label = isMock ? 'MOCK DATA' : isCached ? 'CACHED DATA' : 'LIVE DATA';
                return (
                  <div
                    className="px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-[0.16em]"
                    style={{
                      borderColor: color,
                      color: color,
                      background: `${color}14`,
                    }}
                  >
                    {label}
                  </div>
                );
              })()}
              <div className="text-[11px] font-mono opacity-50 space-y-1">
                <div>ID: {data.snapshot.id}</div>
                <div>Minted: {new Date(data.snapshot.captured_at).toISOString().replace('T', ' ').slice(0, 16)} UTC</div>
              </div>

              {/* Downloads + Share */}
              <div className="border-t border-white/8 pt-3 flex flex-wrap gap-2">
                <a
                  href={pngUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={`px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition ${!pngUrl ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  {pngUrl ? 'DOWNLOAD PNG' : polling ? 'MINTING...' : 'PNG N/A'}
                </a>
                <a
                  href={pdfUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={`px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition ${!pdfUrl ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  {pdfUrl ? 'DOWNLOAD PDF' : polling ? 'MINTING...' : 'PDF N/A'}
                </a>
                <button
                  onClick={shareOnX}
                  className="px-3.5 py-2 rounded-xl border border-white/25 bg-white/10 text-xs font-bold tracking-[0.14em] hover:bg-white/20 transition"
                >
                  SHARE ON X
                </button>
                <span className="px-3.5 py-2 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-bold tracking-[0.14em]">
                  AUTO-SAVED TO VAULT
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Your Card */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="text-xs font-bold tracking-[0.18em] opacity-90 mb-1">YOUR CARD</div>
          <div className="text-xs opacity-50 mb-4">Your generated collectible card</div>

          {pngUrl ? (
            <img
              src={pngUrl}
              alt="Card preview"
              className="w-full rounded-2xl border border-white/10"
            />
          ) : polling ? (
            <div className="aspect-[5/7] rounded-2xl border border-white/8 bg-white/[0.02] flex items-center justify-center">
              <div className="text-xs font-bold tracking-[0.16em] opacity-40 animate-pulse">
                MINTING...
              </div>
            </div>
          ) : (
            <div className="aspect-[5/7] rounded-2xl border border-dashed border-white/8 flex items-center justify-center">
              <div className="text-xs opacity-30 tracking-wider text-center px-8">
                Mint a card to see your collectible here.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
