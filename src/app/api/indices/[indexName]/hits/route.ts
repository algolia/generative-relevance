import { algoliasearch } from 'algoliasearch';
import { NextRequest, NextResponse } from 'next/server';

type Context = { params: Promise<{ indexName: string }> };

export async function GET(_: NextRequest, { params }: Context) {
  try {
    const { indexName } = await params;

    const appId = process.env.ALGOLIA_APP_ID;
    const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY;

    if (!appId || !adminApiKey) {
      return NextResponse.json(
        { error: 'Missing Algolia credentials in environment variables' },
        { status: 500 }
      );
    }

    const client = algoliasearch(appId, adminApiKey);

    const { hits } = await client.searchSingleIndex({
      indexName,
      searchParams: {
        query: '',
        hitsPerPage: 100,
        attributesToRetrieve: ['*'],
      },
    });

    return NextResponse.json({
      hits,
      indexName,
    });
  } catch (err) {
    console.error('Failed to fetch hits:', err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to fetch hits',
      },
      { status: 500 }
    );
  }
}
