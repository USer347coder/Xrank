import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCard } from '../lib/api';
import ScoreCard from '../components/ScoreCard';
import type { Profile, Snapshot } from '../shared/types';

export default function RenderCard() {
  const { snapshotId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!snapshotId) return;
    getCard(snapshotId)
      .then((res) => {
        setProfile(res.profile);
        setSnapshot(res.snapshot);
        setQrUrl(res.qrUrl);
        // Signal to Playwright that card is ready
        (window as any).__CARD_READY__ = true;
      })
      .finally(() => setLoading(false));
  }, [snapshotId]);

  if (loading || !snapshot || !profile) {
    return (
      <div style={{ background: '#07080B', padding: 40, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', opacity: 0.4 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#07080B', padding: 40, minHeight: '100vh' }}>
      <ScoreCard
        username={profile.username}
        displayName={profile.display_name || profile.username}
        avatarUrl={profile.avatar_url || undefined}
        capturedAt={snapshot.captured_at}
        snapshotId={snapshot.id}
        kpis={snapshot.kpis}
        score={snapshot.score}
        tags={(snapshot.provenance as any)?.tags || []}
        qrUrl={qrUrl}
      />
    </div>
  );
}
