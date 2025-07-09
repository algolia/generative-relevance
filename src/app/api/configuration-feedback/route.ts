import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { trackEvent, flushAnalytics } from '@/lib/analytics';

const schema = z.object({
  indexName: z.string().min(1, 'Index name is required'),
  appId: z.string().min(1, 'App ID is required'),
  configurationType: z.enum([
    'searchableAttributes',
    'customRanking',
    'attributesForFaceting',
    'sortableAttributes',
  ]),
  feedback: z.enum(['upvote', 'downvote']),
  explanation: z.string().optional(),
  generatedConfig: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { success, error, data } = schema.safeParse(body);

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    const {
      indexName,
      appId,
      configurationType,
      feedback,
      explanation,
      generatedConfig,
    } = data;

    // Track configuration feedback
    await trackEvent(request, 'AI Configuration Feedback', {
      indexName,
      appId,
      configurationType,
      feedback,
      explanation: explanation || null,
      generatedConfig,
      timestamp: new Date().toISOString(),
    });

    await flushAnalytics();

    return NextResponse.json({
      message: 'Feedback recorded successfully',
    });
  } catch (err) {
    console.error('Configuration feedback error:', err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to record feedback',
      },
      { status: 500 }
    );
  }
}