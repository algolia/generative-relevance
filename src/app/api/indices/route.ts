import { algoliasearch, type SearchClient } from 'algoliasearch';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  generateAttributesForFaceting,
  generateCustomRanking,
  generateSearchableAttributes,
  generateSortByReplicas,
} from '@/lib';
import { trackEvent, flushAnalytics } from '@/lib/analytics';

const schema = z.object({
  indexName: z.string().min(1, 'Index name is required'),
  records: z.array(z.record(z.any())).min(1, 'At least one record is required'),
  appId: z.string().min(1, 'Algolia App ID is required'),
  writeApiKey: z.string().min(1, 'Algolia Admin API Key is required'),
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

    const { indexName, records, appId, writeApiKey } = data;

    try {
      const client = algoliasearch(appId, writeApiKey);

      // Step 1: Run everything in parallel — index creation + AI analysis
      const [
        batchResponse,
        [
          { searchableAttributes },
          { customRanking },
          { attributesForFaceting },
          { sortableAttributes },
        ],
      ] = await Promise.all([
        // Chain: Create index → Wait for tasks to complete → Return batch response
        client
          .saveObjects({ indexName, objects: records })
          .then(async (batchResponse) => {
            await Promise.all(
              batchResponse.map(({ taskID }) =>
                client.waitForTask({ indexName, taskID })
              )
            );

            return batchResponse;
          }),
        // Parallel: AI analysis (independent of index operations)
        Promise.all([
          generateSearchableAttributes(records),
          generateCustomRanking(records),
          generateAttributesForFaceting(records),
          generateSortByReplicas(records),
        ]),
      ]);

      // Step 2: Configure index settings and create replicas in parallel (index exists)
      const [setSettingsResult, { replicaTasks }] = await Promise.all([
        client.setSettings({
          indexName,
          indexSettings: {
            searchableAttributes,
            customRanking,
            attributesForFaceting,
          },
        }),
        createSortByReplicas(client, indexName, sortableAttributes),
      ]);

      const tasks = [
        ...batchResponse.map((result) => ({
          taskID: result.taskID,
          indexName,
          description: 'Saving records',
        })),
        ...[
          {
            taskID: setSettingsResult.taskID,
            indexName,
            description: 'Configuring search settings',
          },
          ...replicaTasks,
        ],
      ];

      const recordAttributes = new Set<string>();

      records.forEach((record) => {
        Object.keys(record).forEach((key) => recordAttributes.add(key));
      });

      await trackEvent(request, 'Index Created with AI Configuration', {
        indexName,
        appId,
        recordCount: records.length,
        recordAttributes: Array.from(recordAttributes),
        generatedConfiguration: {
          searchableAttributes,
          customRanking,
          attributesForFaceting,
          sortableAttributes,
        },
      });

      await flushAnalytics();

      return NextResponse.json({
        message: 'Index creation started',
        indexName,
        tasks,
      });
    } catch (err) {
      console.error('Failed to create Algolia index:', err);

      return NextResponse.json(
        { error: 'Failed to create index in Algolia' },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error('Index creation error:', err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to create index',
      },
      { status: 500 }
    );
  }
}

async function createSortByReplicas(
  client: SearchClient,
  indexName: string,
  sortableAttributes: string[]
) {
  if (sortableAttributes.length === 0) {
    return { sortReplicas: [], replicaTasks: [] };
  }

  const replicaNames: string[] = [];
  const sortReplicas: Array<{ label: string; value: string }> = [];
  const replicaTasks: Array<{
    taskID: number;
    indexName: string;
    description: string;
  }> = [];

  for (const attribute of sortableAttributes) {
    const replicaNameAsc = `${indexName}_${attribute}_asc`;
    const replicaNameDesc = `${indexName}_${attribute}_desc`;

    replicaNames.push(replicaNameAsc, replicaNameDesc);

    const labelBase = generateAttributeLabel(attribute);

    sortReplicas.push(
      {
        label: `${labelBase}: Low to High`,
        value: replicaNameAsc,
      },
      {
        label: `${labelBase}: High to Low`,
        value: replicaNameDesc,
      }
    );
  }

  try {
    // Get current settings to preserve existing configuration
    const originalSettings = await client.getSettings({ indexName });
    const currentReplicas = originalSettings.replicas || [];
    const allReplicas = [...currentReplicas, ...replicaNames];

    // Update main index with replica references and forward settings
    const replicasResult = await client.setSettings({
      indexName,
      indexSettings: {
        replicas: allReplicas,
      },
      forwardToReplicas: true,
    });

    replicaTasks.push({
      taskID: replicasResult.taskID,
      indexName,
      description: 'Creating replica indices',
    });

    // Configure each replica with appropriate ranking only
    for (const attribute of sortableAttributes) {
      const replicaNameAsc = `${indexName}_${attribute}_asc`;
      const replicaNameDesc = `${indexName}_${attribute}_desc`;

      const ascResult = await client.setSettings({
        indexName: replicaNameAsc,
        indexSettings: {
          ranking: [
            `asc(${attribute})`,
            `typo`,
            `geo`,
            `words`,
            `filters`,
            `proximity`,
            `attribute`,
            `exact`,
            `custom`,
          ],
        },
      });

      const descResult = await client.setSettings({
        indexName: replicaNameDesc,
        indexSettings: {
          ranking: [
            `desc(${attribute})`,
            `typo`,
            `geo`,
            `words`,
            `filters`,
            `proximity`,
            `attribute`,
            `exact`,
            `custom`,
          ],
        },
      });

      const labelBase = generateAttributeLabel(attribute);
      replicaTasks.push(
        {
          taskID: ascResult.taskID,
          indexName: replicaNameAsc,
          description: `Configuring ${labelBase} (asc) sort`,
        },
        {
          taskID: descResult.taskID,
          indexName: replicaNameDesc,
          description: `Configuring ${labelBase} (desc) sort`,
        }
      );
    }
  } catch (err) {
    console.error('Failed to create sort replicas:', err);
    throw err;
  }

  return { sortReplicas, replicaTasks };
}

function generateAttributeLabel(attribute: string): string {
  const labelMap: Record<string, string> = {
    price: 'Price',
    cost: 'Cost',
    amount: 'Amount',
    rating: 'Rating',
    score: 'Score',
    popularity: 'Popularity',
    views: 'Views',
    likes: 'Likes',
    sales: 'Sales',
    date: 'Date',
    created_at: 'Date Created',
    updated_at: 'Date Updated',
    published_at: 'Date Published',
    timestamp: 'Date',
    year: 'Year',
    month: 'Month',
    count: 'Count',
    quantity: 'Quantity',
    stock: 'Stock',
    reviews: 'Reviews',
    votes: 'Votes',
  };

  // Check for exact matches
  const lowerAttribute = attribute.toLowerCase();
  if (labelMap[lowerAttribute]) {
    return labelMap[lowerAttribute];
  }

  // Check for partial matches
  for (const [key, label] of Object.entries(labelMap)) {
    if (lowerAttribute.includes(key)) {
      return label;
    }
  }

  // Fallback: clean up the attribute name
  return attribute
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
