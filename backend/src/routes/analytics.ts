import { FastifyInstance } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../firestore.js';
import { BusinessDocument } from '../types.js';

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID ?? '';
const CF_API_TOKEN  = process.env.CF_API_TOKEN  ?? '';

async function verifyPortalToken(authHeader: string | undefined): Promise<string> {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('unauthorized');
  const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
  return decoded.uid;
}

async function queryCAE(sql: string): Promise<{ data: Record<string, unknown>[] }> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'text/plain' },
      body: sql,
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CAE ${res.status}: ${text}`);
  }
  return res.json() as Promise<{ data: Record<string, unknown>[] }>;
}

export async function analyticsRoute(app: FastifyInstance) {
  // Authenticated — full analytics dashboard data for a business page
  app.get<{ Querystring: { slug?: string } }>('/portal/analytics', async (req, reply) => {
    let uid: string;
    try {
      uid = await verifyPortalToken(req.headers.authorization);
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { slug } = req.query;
    if (!slug) return reply.status(400).send({ error: 'slug is required' });

    // Reject malformed slugs before using in SQL
    if (!/^[a-z0-9-]+$/.test(slug)) return reply.status(400).send({ error: 'Invalid slug' });

    // Verify ownership
    const doc = await db.collection('businesses').doc(slug).get();
    if (!doc.exists) return reply.status(404).send({ error: 'Business not found' });
    const biz = doc.data() as BusinessDocument;
    if (biz.ownerUid !== uid) return reply.status(403).send({ error: 'Forbidden' });

    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
      return reply.send({ available: false });
    }

    try {
      const [
        dailyRes, referrersRes, devicesRes, monthRes,
        sessionRes, returnRes, dowRes, hourRes, langRes, utmRes,
      ] = await Promise.all([

        // 1. Daily views — last 30 days
        queryCAE(`
          SELECT toDate(timestamp) as date, count() as views
          FROM taplab_pageviews
          WHERE blob1 = '${slug}' AND blob5 != '__session__'
            AND timestamp >= NOW() - INTERVAL '30' DAY
          GROUP BY date ORDER BY date ASC
        `),

        // 2. Top referrers — last 30 days
        queryCAE(`
          SELECT blob2 as referrer, count() as views
          FROM taplab_pageviews
          WHERE blob1 = '${slug}' AND blob5 != '__session__' AND blob2 != ''
            AND timestamp >= NOW() - INTERVAL '30' DAY
          GROUP BY referrer ORDER BY views DESC LIMIT 8
        `),

        // 3. Device split — last 30 days
        queryCAE(`
          SELECT blob3 as device, count() as views
          FROM taplab_pageviews
          WHERE blob1 = '${slug}' AND blob5 != '__session__' AND blob3 != ''
            AND timestamp >= NOW() - INTERVAL '30' DAY
          GROUP BY device
        `),

        // 4. Views this calendar month
        queryCAE(`
          SELECT count() as views
          FROM taplab_pageviews
          WHERE blob1 = '${slug}' AND blob5 != '__session__'
            AND toStartOfMonth(timestamp) = toStartOfMonth(NOW())
        `),

        // 5. Avg session duration — last 30 days (sessions >2s only)
        queryCAE(`
          SELECT avg(double1) as avg_duration, count() as total_sessions
          FROM taplab_pageviews
          WHERE blob1 = '${slug}' AND blob5 = '__session__'
            AND double1 > 2
            AND timestamp >= NOW() - INTERVAL '30' DAY
        `),

        // 6. Return vs new visitors — last 30 days
        queryCAE(`
          SELECT blob5 as visitor_type, count() as views
          FROM taplab_pageviews
          WHERE blob1 = '${slug}' AND (blob5 = 'new' OR blob5 = 'returning')
            AND timestamp >= NOW() - INTERVAL '30' DAY
          GROUP BY visitor_type
        `),

        // 7. Day-of-week pattern — last 90 days (1=Mon, 7=Sun)
        queryCAE(`
          SELECT toDayOfWeek(timestamp) as dow, count() as views
          FROM taplab_pageviews
          WHERE blob1 = '${slug}' AND blob5 != '__session__'
            AND timestamp >= NOW() - INTERVAL '90' DAY
          GROUP BY dow ORDER BY dow ASC
        `),

        // 8. Peak hours — last 30 days (UTC; frontend converts to IST)
        queryCAE(`
          SELECT toHour(timestamp) as hour, count() as views
          FROM taplab_pageviews
          WHERE blob1 = '${slug}' AND blob5 != '__session__'
            AND timestamp >= NOW() - INTERVAL '30' DAY
          GROUP BY hour ORDER BY hour ASC
        `),

        // 9. Language distribution — last 30 days
        queryCAE(`
          SELECT blob4 as language, count() as views
          FROM taplab_pageviews
          WHERE blob1 = '${slug}' AND blob5 != '__session__' AND blob4 != '' AND blob4 != 'unknown'
            AND timestamp >= NOW() - INTERVAL '30' DAY
          GROUP BY language ORDER BY views DESC LIMIT 5
        `),

        // 10. UTM campaigns — last 30 days (only where campaign is set)
        queryCAE(`
          SELECT blob8 as campaign, blob6 as source, count() as views
          FROM taplab_pageviews
          WHERE blob1 = '${slug}' AND blob5 != '__session__' AND blob8 != 'none'
            AND timestamp >= NOW() - INTERVAL '30' DAY
          GROUP BY campaign, source ORDER BY views DESC LIMIT 10
        `),
      ]);

      const sessionRow = (sessionRes.data ?? [])[0] ?? {};

      return reply.send({
        available: true,
        views30d:       dailyRes.data     ?? [],
        referrers:      referrersRes.data ?? [],
        devices:        devicesRes.data   ?? [],
        viewsThisMonth: Number((monthRes.data ?? [])[0]?.views ?? 0),
        avgDuration:    Number(sessionRow.avg_duration ?? 0),
        totalSessions:  Number(sessionRow.total_sessions ?? 0),
        returnVisitors: returnRes.data ?? [],
        dowPattern:     dowRes.data    ?? [],
        hourPattern:    hourRes.data   ?? [],
        languages:      langRes.data   ?? [],
        utmCampaigns:   utmRes.data    ?? [],
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch analytics' });
    }
  });

  // CSV export — 90-day daily views download
  app.get<{ Querystring: { slug?: string } }>('/portal/analytics/export', async (req, reply) => {
    let uid: string;
    try {
      uid = await verifyPortalToken(req.headers.authorization);
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { slug } = req.query;
    if (!slug) return reply.status(400).send({ error: 'slug is required' });
    if (!/^[a-z0-9-]+$/.test(slug)) return reply.status(400).send({ error: 'Invalid slug' });

    const doc = await db.collection('businesses').doc(slug).get();
    if (!doc.exists) return reply.status(404).send({ error: 'Business not found' });
    const biz = doc.data() as BusinessDocument;
    if (biz.ownerUid !== uid) return reply.status(403).send({ error: 'Forbidden' });

    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
      return reply.status(503).send({ error: 'Analytics not configured' });
    }

    try {
      const result = await queryCAE(`
        SELECT toDate(timestamp) as date, count() as views
        FROM taplab_pageviews
        WHERE blob1 = '${slug}' AND blob5 != '__session__'
          AND timestamp >= NOW() - INTERVAL '90' DAY
        GROUP BY date ORDER BY date ASC
      `);

      const rows = result.data ?? [];
      const csv = ['date,views', ...rows.map((r) => `${r.date},${r.views}`)].join('\n');

      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="taplab-${slug}-analytics.csv"`);
      return reply.send(csv);
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Export failed' });
    }
  });
}
