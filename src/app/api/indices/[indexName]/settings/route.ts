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
    const { searchableAttributes, customRanking, attributesForFaceting } =
      await request.json();

    const appId = process.env.ALGOLIA_APP_ID;
    const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY;

    if (!appId || !adminApiKey) {
      return NextResponse.json(
        { error: 'Missing Algolia credentials in environment variables' },
        { status: 500 }
      );
    }

    const client = algoliasearch(appId, adminApiKey);

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
