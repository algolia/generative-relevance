import { Analytics } from '@segment/analytics-node';

const client = new Analytics({ writeKey: process.env.SEGMENT_WRITE_KEY || '' });

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
  properties?: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      'Skipping Segment event in non-production environment:',
      event,
      properties
    );
    return;
  }

  const anonymousId = generateAnonymousId(request);

  try {
    client.track({
      anonymousId,
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
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  try {
    await client.flush();
  } catch (err) {
    console.error('Failed to flush analytics:', err);
  }
}
