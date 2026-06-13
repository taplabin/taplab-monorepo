export interface Env {
  TAPLAB_PAGEVIEWS: AnalyticsEngineDataset;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function ok(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

function err(status: number, msg: string): Response {
  return new Response(msg, { status, headers: CORS });
}

function sanitizeSlug(v: unknown): string | null {
  if (typeof v !== 'string' || !/^[a-z0-9-]+$/.test(v)) return null;
  return v;
}

async function parseBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return err(405, 'Method not allowed');

    const { pathname } = new URL(request.url);
    const body = await parseBody(request);
    if (!body) return err(400, 'Bad request');

    // Drop events from local development — silently accept so the page doesn't error
    const origin = request.headers.get('Origin') ?? '';
    if (/localhost|127\.0\.0\.1/.test(origin)) return ok();

    const slug = sanitizeSlug(body.businessId);
    if (!slug) return err(400, 'Invalid businessId');

    // ── Pageview event ──────────────────────────────────────────────────────
    if (pathname === '/pageview') {
      const isMobile = typeof body.screenWidth === 'number' ? body.screenWidth < 768 : false;

      let referrerDomain = 'direct';
      if (typeof body.referrer === 'string' && body.referrer) {
        try { referrerDomain = new URL(body.referrer).hostname || 'direct'; } catch {}
      }

      const language    = typeof body.language    === 'string' ? body.language.slice(0, 10) : 'unknown';
      const visitorType = body.returning === true ? 'returning' : 'new';
      const utmSource   = typeof body.utmSource   === 'string' && body.utmSource   ? body.utmSource.slice(0, 50)   : 'none';
      const utmMedium   = typeof body.utmMedium   === 'string' && body.utmMedium   ? body.utmMedium.slice(0, 50)   : 'none';
      const utmCampaign = typeof body.utmCampaign === 'string' && body.utmCampaign ? body.utmCampaign.slice(0, 100) : 'none';

      env.TAPLAB_PAGEVIEWS.writeDataPoint({
        // blob1: slug | blob2: referrer | blob3: device | blob4: language
        // blob5: visitor_type | blob6: utm_source | blob7: utm_medium | blob8: utm_campaign
        blobs: [slug, referrerDomain, isMobile ? 'mobile' : 'desktop', language, visitorType, utmSource, utmMedium, utmCampaign],
        doubles: [0],
        indexes: [slug],
      });

      return ok();
    }

    // ── Session event ───────────────────────────────────────────────────────
    if (pathname === '/session') {
      const duration = typeof body.duration === 'number' ? Math.round(body.duration) : 0;
      // Ignore sub-2s bounces and impossibly long sessions (>2hr)
      if (duration < 2 || duration > 7200) return ok();

      env.TAPLAB_PAGEVIEWS.writeDataPoint({
        // blob5 = '__session__' distinguishes session events from pageview events
        blobs: [slug, '', '', '', '__session__', '', '', ''],
        doubles: [duration],
        indexes: [slug],
      });

      return ok();
    }

    return err(404, 'Not found');
  },
};
