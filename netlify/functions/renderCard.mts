import type { Config, Context } from '@netlify/functions';
import { supabaseAdmin } from '../lib/supabaseAdmin.mts';
import { jsonResponse, errorResponse, corsResponse } from '../lib/response.mts';
import { buildCardHTML, type CardData } from '../lib/cardTemplate.mts';
import { generateQrDataUri } from '../lib/qr.mts';
import { launchBrowser } from '../lib/chromium.mts';
import { CARD_WIDTH, CARD_HEIGHT } from '../../src/shared/constants.ts';

export const config: Config = {
  path: '/api/render-card',
  method: ['POST', 'OPTIONS'],
};

/**
 * Render a card for a given snapshotId.
 * Produces PNG and PDF, uploads to Supabase Storage, inserts card_assets rows.
 * Returns { ok, pngUrl, pdfUrl }.
 */
async function renderCardForSnapshot(snapshotId: string): Promise<{ pngUrl: string; pdfUrl: string }> {
  // 1. Fetch snapshot + profile
  const { data: snap, error: snapErr } = await supabaseAdmin
    .from('snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single();

  if (snapErr || !snap) throw new Error(`Snapshot not found: ${snapErr?.message}`);

  const { data: prof, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', snap.profile_id)
    .single();

  if (profErr || !prof) throw new Error(`Profile not found: ${profErr?.message}`);

  // 2. Fetch avatar as base64
  let avatarBase64: string | null = null;
  if (prof.avatar_url) {
    try {
      const avatarRes = await fetch(prof.avatar_url);
      if (avatarRes.ok) {
        const buf = await avatarRes.arrayBuffer();
        const ct = avatarRes.headers.get('content-type') || 'image/jpeg';
        avatarBase64 = `data:${ct};base64,${Buffer.from(buf).toString('base64')}`;
      }
    } catch (e) {
      console.warn('[renderCard] Failed to fetch avatar:', e);
    }
  }

  // 3. Generate QR
  const siteUrl = process.env.SITE_URL || '';
  const publicCardUrl = `${siteUrl}/card/${snap.id}`;
  const qrDataUri = await generateQrDataUri(publicCardUrl);

  // 4. Build HTML
  const cardData: CardData = {
    username: prof.username,
    displayName: prof.display_name || prof.username,
    avatarBase64,
    capturedAt: snap.captured_at,
    snapshotId: snap.id,
    kpis: snap.kpis,
    score: snap.score,
    tags: snap.provenance?.tags || [],
    qrDataUri,
  };
  const html = buildCardHTML(cardData);

  // 5. Launch browser + screenshot
  const browser = await launchBrowser();
  const page = await browser.newPage({
    viewport: { width: CARD_WIDTH, height: CARD_HEIGHT },
  });

  await page.setContent(html, { waitUntil: 'networkidle' });

  // Wait a moment for fonts
  await page.waitForTimeout(500);

  const pngBuffer = await page.screenshot({ type: 'png' });

  // PDF
  const pdfBuffer = await page.pdf({
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });

  await browser.close();

  // 6. Upload to Supabase Storage
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const pngPath = `cards/${snapshotId}/${ts}.png`;
  const pdfPath = `cards/${snapshotId}/${ts}.pdf`;

  const { error: pngUpErr } = await supabaseAdmin.storage
    .from('cards')
    .upload(pngPath, pngBuffer, { upsert: true, contentType: 'image/png' });
  if (pngUpErr) throw new Error(`PNG upload failed: ${pngUpErr.message}`);

  const { error: pdfUpErr } = await supabaseAdmin.storage
    .from('cards')
    .upload(pdfPath, pdfBuffer, { upsert: true, contentType: 'application/pdf' });
  if (pdfUpErr) throw new Error(`PDF upload failed: ${pdfUpErr.message}`);

  const { data: pngUrlData } = supabaseAdmin.storage.from('cards').getPublicUrl(pngPath);
  const { data: pdfUrlData } = supabaseAdmin.storage.from('cards').getPublicUrl(pdfPath);

  const pngUrl = pngUrlData.publicUrl;
  const pdfUrl = pdfUrlData.publicUrl;

  // 7. Upsert card_assets rows
  await supabaseAdmin.from('card_assets').upsert(
    { snapshot_id: snapshotId, format: 'png', url: pngUrl, width: CARD_WIDTH, height: CARD_HEIGHT },
    { onConflict: 'snapshot_id,format' }
  );

  await supabaseAdmin.from('card_assets').upsert(
    { snapshot_id: snapshotId, format: 'pdf', url: pdfUrl, width: null, height: null },
    { onConflict: 'snapshot_id,format' }
  );

  return { pngUrl, pdfUrl };
}

export { renderCardForSnapshot };

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const body = await req.json();
    const snapshotId = body?.snapshotId;
    if (!snapshotId) return errorResponse('snapshotId required', 400);

    const result = await renderCardForSnapshot(snapshotId);
    return jsonResponse({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[renderCard] Error:', msg);
    return errorResponse(msg);
  }
};
