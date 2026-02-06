import { useState, useMemo, useCallback } from 'react';
import { captureSnapshot, saveToVault, getAssets } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import AuthForm from '../components/AuthForm';
import type { CaptureResult, CardAsset } from '../shared/types';
import { TIER_CONFIG } from '../shared/constants';
import type { TierName } from '../shared/types';

export default function Home() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<CaptureResult | null>(null);
  const [assets, setAssets] = useState<CardAsset[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const pngUrl = useMemo(() => assets.find((a) => a.format === 'png')?.url, [assets]);
  const pdfUrl = useMemo(() => assets.find((a) => a.format === 'pdf')?.url, [assets]);

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
          setAssets(res.assets);
          setPolling(false);
          return;
        }
      } catch {}

      if (attempts < maxAttempts) {
        setTimeout(poll, interval);
      } else {
        setPolling(false);
      }
    };

    setTimeout(poll, 3000); // Initial delay before first poll
  }, []);

  async function onCapture() {
    setError(null);
    setSaveMsg(null);
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
      } else {
        // Poll for background render
        pollAssets(res.snapshot.id);
      }
    } catch (e: any) {
      setError(e.message || 'Capture failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    setSaveMsg(null);
    if (!data?.snapshot?.id) return;
    if (!user) {
      setSaveMsg('Please login first.');
      return;
    }
    const res = await saveToVault(data.snapshot.id, visibility);
    if (res.error) setSaveMsg(res.error);
    else setSaveMsg('Saved to vault!');
  }

  const tier = data?.snapshot?.score?.tier as TierName | undefined;
  const tierCfg = tier ? TIER_CONFIG[tier] : null;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Left: Capture */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="text-xs font-bold tracking-[0.18em] opacity-90 mb-1">CAPTURE</div>
          <div className="text-xs opacity-50 mb-4">
            Enter an X username &rarr; snapshot &rarr; score &rarr; collectible card
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
              {busy ? 'CAPTURING...' : 'CAPTURE SNAPSHOT'}
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
                {data.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-lg border text-[10px] font-black tracking-[0.16em] uppercase"
                    style={{
                      borderColor: t === 'foil' ? '#FFD700' : t === 'genesis' ? '#00FFAA' : 'rgba(255,255,255,0.15)',
                      color: t === 'foil' ? '#FFD700' : t === 'genesis' ? '#00FFAA' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Snapshot info */}
              <div className="text-[11px] font-mono opacity-50 space-y-1">
                <div>ID: {data.snapshot.id}</div>
                <div>Captured: {new Date(data.snapshot.captured_at).toISOString().replace('T', ' ').slice(0, 16)} UTC</div>
              </div>

              {/* Downloads */}
              <div className="border-t border-white/8 pt-3 flex flex-wrap gap-2">
                <a
                  href={pngUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={`px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition ${!pngUrl ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  {pngUrl ? 'DOWNLOAD PNG' : polling ? 'RENDERING...' : 'PNG N/A'}
                </a>
                <a
                  href={pdfUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className={`px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition ${!pdfUrl ? 'opacity-40 pointer-events-none' : ''}`}
                >
                  {pdfUrl ? 'DOWNLOAD PDF' : polling ? 'RENDERING...' : 'PDF N/A'}
                </a>
              </div>

              {/* Save to vault */}
              <div className="border-t border-white/8 pt-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-white/15 bg-black/30 text-xs text-white outline-none"
                  >
                    <option value="public">public</option>
                    <option value="unlisted">unlisted</option>
                    <option value="private">private</option>
                  </select>
                  <button
                    onClick={onSave}
                    className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition"
                  >
                    SAVE TO VAULT
                  </button>
                </div>
                {saveMsg && (
                  <div className="mt-2 text-xs font-mono opacity-70">{saveMsg}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Preview + Auth */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="text-xs font-bold tracking-[0.18em] opacity-90 mb-1">PREVIEW</div>
          <div className="text-xs opacity-50 mb-4">Your generated collectible card</div>

          {pngUrl ? (
            <img
              src={pngUrl}
              alt="Card preview"
              className="w-full rounded-2xl border border-white/10"
            />
          ) : polling ? (
            <div className="aspect-[16/10] rounded-2xl border border-white/8 bg-white/[0.02] flex items-center justify-center">
              <div className="text-xs font-bold tracking-[0.16em] opacity-40 animate-pulse">
                GENERATING CARD...
              </div>
            </div>
          ) : (
            <div className="aspect-[16/10] rounded-2xl border border-dashed border-white/8 flex items-center justify-center">
              <div className="text-xs opacity-30 tracking-wider text-center px-8">
                Capture a snapshot to see your collectible card preview here.
              </div>
            </div>
          )}
        </div>

        <AuthForm />
      </div>
    </div>
  );
}
