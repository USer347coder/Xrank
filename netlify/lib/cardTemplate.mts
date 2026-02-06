import type { KPIs, Score } from '../../src/shared/types.ts';
import { TIER_CONFIG, KPI_LABELS, CARD_WIDTH, CARD_HEIGHT } from '../../src/shared/constants.ts';
import { formatNumber, shortId } from '../../src/shared/score.ts';

export interface CardData {
  username: string;
  displayName: string;
  avatarBase64: string | null; // data:image/... or null
  capturedAt: string;          // ISO string
  snapshotId: string;
  kpis: KPIs;
  score: Score;
  tags: string[];
  qrDataUri: string;
}

function fmt(n: number): string {
  return formatNumber(n);
}

/**
 * Build a self-contained HTML string for the card.
 * All CSS is inline. Avatar and QR are embedded as data URIs.
 */
export function buildCardHTML(data: CardData): string {
  const tier = TIER_CONFIG[data.score.tier];
  const cardId = shortId(data.snapshotId);
  const ts = new Date(data.capturedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  const tagBadges = data.tags.map(t =>
    `<span style="
      display:inline-block;
      padding:4px 10px;
      border-radius:8px;
      border:1px solid ${t === 'foil' ? '#FFD700' : t === 'genesis' ? '#00FFAA' : 'rgba(255,255,255,0.2)'};
      background:${t === 'foil' ? 'rgba(255,215,0,0.15)' : t === 'genesis' ? 'rgba(0,255,170,0.12)' : 'rgba(0,0,0,0.3)'};
      font-size:10px;
      font-weight:900;
      letter-spacing:0.22em;
      color:${t === 'foil' ? '#FFD700' : t === 'genesis' ? '#00FFAA' : 'rgba(255,255,255,0.7)'};
      text-transform:uppercase;
    ">${t}</span>`
  ).join('');

  const traitTiles = KPI_LABELS.map(({ key, label }) => `
    <div style="
      border:1px solid rgba(255,255,255,0.14);
      border-radius:14px;
      background:rgba(0,0,0,0.30);
      padding:12px 14px;
    ">
      <div style="
        letter-spacing:0.20em;
        font-weight:800;
        font-size:10px;
        opacity:0.68;
        text-transform:uppercase;
      ">${label}</div>
      <div style="
        margin-top:8px;
        font-size:20px;
        letter-spacing:0.06em;
        font-weight:900;
      ">${fmt(data.kpis[key])}</div>
    </div>
  `).join('');

  const avatarImg = data.avatarBase64
    ? `<img src="${data.avatarBase64}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;" />`
    : `<div style="width:100%;height:100%;border-radius:14px;background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:60px;font-weight:900;opacity:0.3;">${data.username.charAt(0).toUpperCase()}</div>`;

  // Foil shimmer overlay
  const foilOverlay = data.tags.includes('foil') ? `
    <div style="
      position:absolute;
      inset:0;
      border-radius:22px;
      background:linear-gradient(
        115deg,
        transparent 20%,
        rgba(255,215,0,0.08) 40%,
        rgba(255,255,255,0.12) 50%,
        rgba(255,215,0,0.08) 60%,
        transparent 80%
      );
      pointer-events:none;
      z-index:10;
    "></div>
  ` : '';

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
<div style="
  width:${CARD_WIDTH}px;
  height:${CARD_HEIGHT}px;
  background:
    radial-gradient(1200px 800px at 30% 20%, rgba(255,255,255,0.06), transparent 60%),
    radial-gradient(900px 700px at 70% 80%, ${tier.glow}, transparent 60%),
    #07080B;
  border:1px solid rgba(255,255,255,0.10);
  border-radius:22px;
  position:relative;
  overflow:hidden;
  color:rgba(255,255,255,0.92);
  padding:24px;
">
  ${foilOverlay}

  <!-- Ambient glow -->
  <div style="
    position:absolute;inset:-80px;
    background:
      linear-gradient(115deg, ${tier.glow}, transparent 35%),
      linear-gradient(45deg, rgba(255,255,255,0.04), transparent 45%);
    pointer-events:none;
    z-index:0;
  "></div>

  <!-- Top pills -->
  <div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:2;margin-bottom:14px;">
    <div style="
      padding:8px 16px;
      border:1px solid rgba(255,255,255,0.18);
      border-radius:12px;
      letter-spacing:0.22em;
      font-weight:700;
      font-size:12px;
      color:rgba(255,255,255,0.80);
      background:rgba(0,0,0,0.20);
      display:flex;
      align-items:center;
      gap:8px;
    ">CREATOR ${tagBadges}</div>
    <div style="
      padding:8px 16px;
      border:1px solid rgba(255,255,255,0.18);
      border-radius:12px;
      letter-spacing:0.22em;
      font-weight:700;
      font-size:12px;
      color:rgba(255,255,255,0.80);
      background:rgba(0,0,0,0.20);
    ">SOCIAL SCORE</div>
  </div>

  <!-- Left: avatar + identity -->
  <div style="position:relative;z-index:2;width:340px;">
    <div style="
      width:180px;height:180px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,0.16);
      background:rgba(255,255,255,0.04);
      padding:8px;
      box-shadow:0 16px 50px rgba(0,0,0,0.5);
    ">
      ${avatarImg}
    </div>

    <div style="
      margin-top:16px;
      font-size:28px;
      letter-spacing:0.08em;
      font-weight:800;
      text-transform:uppercase;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      max-width:320px;
    ">${data.displayName}</div>

    <div style="
      margin-top:8px;
      width:fit-content;
      padding:8px 14px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,0.16);
      background:rgba(0,0,0,0.22);
      letter-spacing:0.20em;
      font-weight:700;
      font-size:12px;
      color:rgba(255,255,255,0.72);
    ">@${data.username}</div>
  </div>

  <!-- Right: score + tier -->
  <div style="
    position:absolute;
    right:28px;top:90px;
    width:420px;
    z-index:2;
    text-align:right;
  ">
    <div style="
      letter-spacing:0.26em;
      font-weight:800;
      font-size:14px;
      color:${tier.color};
      text-shadow:0 0 20px ${tier.glow};
    ">${tier.label}</div>

    <div style="
      font-size:100px;
      font-weight:900;
      letter-spacing:0.06em;
      line-height:1.0;
      margin-top:4px;
      text-shadow:0 8px 30px rgba(0,0,0,0.7);
    ">${data.score.value}</div>

    <div style="
      margin-top:10px;
      letter-spacing:0.10em;
      font-size:11px;
      opacity:0.65;
    ">${ts}</div>
  </div>

  <!-- Bottom: 6 trait tiles (3x2 grid) -->
  <div style="
    position:absolute;
    left:24px;right:24px;bottom:68px;
    z-index:2;
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:10px;
  ">
    ${traitTiles}
  </div>

  <!-- Footer: card ID + QR -->
  <div style="
    position:absolute;
    left:24px;right:24px;bottom:18px;
    z-index:2;
    display:flex;
    justify-content:space-between;
    align-items:center;
  ">
    <div style="
      letter-spacing:0.20em;
      font-weight:800;
      font-size:10px;
      opacity:0.72;
    ">CARD ID: ${cardId}</div>

    <img
      src="${data.qrDataUri}"
      style="
        width:48px;height:48px;
        border-radius:8px;
        border:1px solid rgba(255,255,255,0.10);
        background:rgba(0,0,0,0.2);
        padding:3px;
      "
    />
  </div>
</div>
</body>
</html>`;
}
