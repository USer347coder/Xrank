import type { KPIs, Score } from '../../src/shared/types.ts';
import { TIER_CONFIG, KPI_LABELS, CARD_WIDTH, CARD_HEIGHT } from '../../src/shared/constants.ts';
import { formatNumber, shortId } from '../../src/shared/score.ts';

export interface CardData {
  username: string;
  displayName: string;
  bio: string;
  avatarBase64: string | null; // data:image/... or null
  capturedAt: string;          // ISO string
  snapshotId: string;
  kpis: KPIs;
  score: Score;
  cardNumber: number;
  tags: string[];
  qrDataUri: string;
  source?: 'x_api' | 'mock' | 'cached';
}

function fmt(n: number): string {
  return formatNumber(n);
}

/**
 * Build a self-contained HTML string for the card.
 * Portrait orientation (630×880), Pokemon-inspired trading card design.
 * All CSS is inline. Avatar and QR are embedded as data URIs.
 */
export function buildCardHTML(data: CardData): string {
  const tier = TIER_CONFIG[data.score.tier];
  const cardId = shortId(data.snapshotId);
  const ts = new Date(data.capturedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  // Truncate bio to ~120 chars for card display
  const bio = data.bio
    ? (data.bio.length > 120 ? data.bio.slice(0, 117) + '...' : data.bio)
    : '';

  const TAG_LABELS: Record<string, string> = { genesis: '1ST ED.', foil: 'HOLO' };
  const tagBadges = data.tags.map(t =>
    `<span style="
      display:inline-block;
      padding:3px 8px;
      border-radius:6px;
      border:1px solid ${t === 'foil' ? '#FFD700' : t === 'genesis' ? '#00FFAA' : 'rgba(255,255,255,0.2)'};
      background:${t === 'foil' ? 'rgba(255,215,0,0.15)' : t === 'genesis' ? 'rgba(0,255,170,0.12)' : 'rgba(0,0,0,0.3)'};
      font-size:9px;
      font-weight:900;
      letter-spacing:0.18em;
      color:${t === 'foil' ? '#FFD700' : t === 'genesis' ? '#00FFAA' : 'rgba(255,255,255,0.7)'};
      text-transform:uppercase;
    ">${TAG_LABELS[t] || t.toUpperCase()}</span>`
  ).join('');

  const traitTiles = KPI_LABELS.map(({ key, label }) => `
    <div style="
      border:1px solid rgba(255,255,255,0.10);
      border-radius:10px;
      background:rgba(0,0,0,0.35);
      padding:8px 10px;
      text-align:center;
    ">
      <div style="
        letter-spacing:0.16em;
        font-weight:800;
        font-size:8px;
        opacity:0.55;
        text-transform:uppercase;
        margin-bottom:4px;
      ">${label}</div>
      <div style="
        font-size:16px;
        letter-spacing:0.04em;
        font-weight:900;
      ">${fmt(data.kpis[key])}</div>
    </div>
  `).join('');

  const avatarImg = data.avatarBase64
    ? `<img src="${data.avatarBase64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<div style="width:100%;height:100%;border-radius:50%;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:72px;font-weight:900;opacity:0.3;">${data.username.charAt(0).toUpperCase()}</div>`;

  // Foil shimmer overlay
  const foilOverlay = data.tags.includes('foil') ? `
    <div style="
      position:absolute;
      inset:0;
      border-radius:18px;
      background:linear-gradient(
        135deg,
        transparent 15%,
        rgba(255,215,0,0.06) 30%,
        rgba(255,255,255,0.10) 45%,
        rgba(255,215,0,0.06) 60%,
        transparent 75%
      );
      pointer-events:none;
      z-index:10;
    "></div>
  ` : '';

  // Tier-colored outer border gradient
  const borderGradient = `linear-gradient(160deg, ${tier.color}, ${tier.glow}, ${tier.color})`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      width: ${CARD_WIDTH}px;
      height: ${CARD_HEIGHT}px;
      overflow: hidden;
      background: transparent;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  </style>
</head>
<body>
<!-- Outer frame (tier-colored border) -->
<div style="
  width:${CARD_WIDTH}px;
  height:${CARD_HEIGHT}px;
  border-radius:22px;
  padding:3px;
  background:${borderGradient};
  position:relative;
">
<!-- Inner card -->
<div style="
  width:100%;
  height:100%;
  background:
    radial-gradient(800px 600px at 50% 20%, rgba(255,255,255,0.05), transparent 60%),
    radial-gradient(600px 500px at 50% 80%, ${tier.glow}, transparent 60%),
    #0A0C10;
  border-radius:19px;
  position:relative;
  overflow:hidden;
  color:rgba(255,255,255,0.92);
  padding:20px 24px;
  display:flex;
  flex-direction:column;
">
  ${foilOverlay}

  <!-- Ambient glow -->
  <div style="
    position:absolute;inset:-60px;
    background:
      linear-gradient(160deg, ${tier.glow}, transparent 40%),
      linear-gradient(340deg, rgba(255,255,255,0.03), transparent 40%);
    pointer-events:none;
    z-index:0;
  "></div>

  <!-- Top bar: Tier + Edition + Score HP -->
  <div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:2;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:6px;">
      <div style="
        padding:5px 12px;
        border-radius:8px;
        border:1px solid ${tier.color}44;
        background:${tier.glow};
        font-size:11px;
        font-weight:900;
        letter-spacing:0.20em;
        color:${tier.color};
        text-shadow:0 0 12px ${tier.glow};
      ">${tier.label}</div>
      ${tagBadges}
    </div>
    <div style="display:flex;align-items:baseline;gap:4px;">
      <span style="font-size:10px;font-weight:700;letter-spacing:0.16em;opacity:0.5;">SCORE</span>
      <span style="
        font-size:32px;
        font-weight:900;
        letter-spacing:0.04em;
        line-height:1;
        color:${tier.color};
        text-shadow:0 0 20px ${tier.glow}, 0 4px 12px rgba(0,0,0,0.5);
      ">${data.score.value}</span>
    </div>
  </div>

  <!-- Avatar (centered, large, circular) -->
  <div style="position:relative;z-index:2;display:flex;justify-content:center;margin-bottom:14px;">
    <div style="
      width:200px;height:200px;
      border-radius:50%;
      border:3px solid ${tier.color}55;
      background:rgba(255,255,255,0.04);
      padding:5px;
      box-shadow:
        0 0 30px ${tier.glow},
        0 16px 40px rgba(0,0,0,0.5),
        inset 0 0 20px rgba(0,0,0,0.3);
    ">
      ${avatarImg}
    </div>
  </div>

  <!-- Name + Handle + Bio (centered) -->
  <div style="position:relative;z-index:2;text-align:center;margin-bottom:14px;">
    <div style="
      font-size:24px;
      letter-spacing:0.06em;
      font-weight:900;
      text-transform:uppercase;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      max-width:560px;
      margin:0 auto;
      text-shadow:0 2px 8px rgba(0,0,0,0.5);
    ">${data.displayName}</div>

    <div style="
      margin-top:6px;
      display:inline-block;
      padding:4px 12px;
      border-radius:8px;
      border:1px solid rgba(255,255,255,0.12);
      background:rgba(0,0,0,0.25);
      letter-spacing:0.18em;
      font-weight:700;
      font-size:11px;
      color:rgba(255,255,255,0.60);
    ">@${data.username}</div>

    ${bio ? `
    <div style="
      margin-top:10px;
      font-size:11px;
      line-height:1.5;
      opacity:0.50;
      font-style:italic;
      max-width:480px;
      margin-left:auto;
      margin-right:auto;
      overflow:hidden;
      display:-webkit-box;
      -webkit-line-clamp:2;
      -webkit-box-orient:vertical;
    ">&ldquo;${bio}&rdquo;</div>
    ` : ''}
  </div>

  <!-- Divider line -->
  <div style="
    position:relative;z-index:2;
    height:1px;
    background:linear-gradient(90deg, transparent, ${tier.color}33, rgba(255,255,255,0.08), ${tier.color}33, transparent);
    margin:0 10px 14px;
  "></div>

  <!-- 6 stat tiles (3x2) -->
  <div style="
    position:relative;z-index:2;
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:8px;
    margin-bottom:14px;
    flex-grow:1;
  ">
    ${traitTiles}
  </div>

  <!-- Footer: edition + card ID + QR -->
  <div style="
    position:relative;z-index:2;
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding-top:8px;
    border-top:1px solid rgba(255,255,255,0.06);
  ">
    <div>
      <div style="
        font-size:11px;
        font-weight:900;
        letter-spacing:0.14em;
        opacity:0.80;
        margin-bottom:3px;
      ">ED. #${data.cardNumber}</div>
      <div style="
        letter-spacing:0.16em;
        font-weight:700;
        font-size:9px;
        opacity:0.45;
      ">${cardId} &middot; <span style="color:${data.source === 'mock' ? '#FF6B35' : '#00FF88'}">${data.source === 'mock' ? 'MOCK' : data.source === 'cached' ? 'CACHED' : 'LIVE'}</span> &middot; ${ts}</div>
    </div>

    <img
      src="${data.qrDataUri}"
      style="
        width:44px;height:44px;
        border-radius:8px;
        border:1px solid rgba(255,255,255,0.08);
        background:rgba(0,0,0,0.25);
        padding:3px;
      "
    />
  </div>
</div>
</div>
</body>
</html>`;
}
