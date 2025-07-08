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

    const settings = await client.getSettings({ indexName });

    const replicas = settings.replicas || [];

    const sortReplicas = replicas
      .filter(
        // TODO: Check first ranking criterion for each replica
        // for more accurate detection
        (replica) => replica.includes('_asc') || replica.includes('_desc')
      )
      .map((replica) => {
        const parts = replica.split('_');
        const direction = parts.pop();
        const attribute = parts.slice(1).join('_'); // Remove index name prefix

        return { attribute, direction, replica };
      });

    return NextResponse.json({
      searchableAttributes: settings.searchableAttributes || [],
      customRanking: settings.customRanking || [],
      attributesForFaceting: settings.attributesForFaceting || [],
      sortReplicas,
      indexName,
    });
  } catch (err) {
    console.error('Failed to fetch settings:', err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to fetch settings',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const { indexName } = await params;
    const {
      searchableAttributes,
      customRanking,
      attributesForFaceting,
      appId,
      writeApiKey,
    } = await request.json();

    if (!appId || !writeApiKey) {
      return NextResponse.json(
        { error: 'Missing Algolia credentials in request body' },
        { status: 400 }
      );
    }

    const client = algoliasearch(appId, writeApiKey);

    const { taskID } = await client.setSettings({
      indexName,
      indexSettings: {
        searchableAttributes,
        customRanking,
        attributesForFaceting,
      },
    });

    return NextResponse.json({
      message: 'Settings updated successfully',
      taskID,
    });
  } catch (err) {
    console.error('Failed to update settings:', err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to update settings',
      },
      { status: 500 }
    );
  }
}
