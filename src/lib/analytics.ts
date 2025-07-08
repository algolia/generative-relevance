import { Analytics } from '@segment/analytics-node';

let analytics: Analytics | null = null;

function getAnalytics() {
  if (!analytics) {
    const writeKey = process.env.SEGMENT_WRITE_KEY;

    if (!writeKey) {
      console.warn('SEGMENT_WRITE_KEY not found in environment variables');

      return null;
    }
    analytics = new Analytics({ writeKey });
  }
  return analytics;
}

function generateAnonymousId(request: Request): string {
  const userAgent = request.headers.get('user-agent') || '';
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const hash = Buffer.from(`${ip}-${userAgent}`).toString('base64');

  return hash.slice(0, 32);
}

export async function trackEvent(
  request: Request,
  event: string,
  properties?: Record<string, unknown>,
  userId?: string
) {
  const client = getAnalytics();

  if (!client) {
    return;
  }

  const anonymousId = generateAnonymousId(request);

  try {
    client.track({
      userId: userId || anonymousId,
      anonymousId: !userId ? anonymousId : undefined,
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
      },
    });
  } catch (err) {
    console.error('Failed to track event:', err);
  }
}

export async function flushAnalytics() {
  const client = getAnalytics();

  if (!client) {
    return;
  }

  try {
    await client.flush();
  } catch (error) {
    console.error('Failed to flush analytics:', error);
  }
}
