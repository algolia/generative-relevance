import { algoliasearch } from 'algoliasearch';
import { NextRequest, NextResponse } from 'next/server';

type Context = { params: Promise<{ indexName: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { indexName } = await params;
    const url = new URL(request.url);
    const appId = url.searchParams.get('appId');
    const writeApiKey = url.searchParams.get('writeApiKey');

    if (!appId || !writeApiKey) {
      return NextResponse.json(
        { error: 'Missing Algolia credentials in query parameters' },
        { status: 400 }
      );
    }

    const client = algoliasearch(appId, writeApiKey);

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
