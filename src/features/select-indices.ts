import type { Algoliasearch } from 'algoliasearch';

const MAX_TOP_INDICES = 1;
const MINIMUM_RECORDS_COUNT = 500;
const NON_PRODUCTION_INDEX_NAME_PATTERNS = ['test', 'staging'];

export async function selectIndices(
  appClient: Algoliasearch,
  logFn = (...lines: string[]) => console.log(...lines)
) {
  logFn('\nListing indices…');

  const allIndices = (await appClient.listIndices({ hitsPerPage: 1000 })).items;
  const productionIndices = await getProductionIndices(
    appClient,
    allIndices,
    logFn
  );
  if (productionIndices.length > 0) {
    const topIndices = productionIndices.slice(0, MAX_TOP_INDICES);

    logFn(
      '\nSelected top indices:',
      topIndices.map((index) => `- ${index}`).join('\n')
    );
    return topIndices;
  }

  logFn('- Using local heuristics');

  const qsIndices = await getQuerySuggestionsIndices(appClient);
  const primaryIndices = allIndices.filter(
    (index) =>
      !index.primary &&
      !qsIndices.includes(index.name) &&
      index.entries > MINIMUM_RECORDS_COUNT &&
      !NON_PRODUCTION_INDEX_NAME_PATTERNS.some((pattern) =>
        index.name.includes(pattern)
      )
  );

  if (primaryIndices.length === 0) {
    logFn('- No primary indices found');

    return [];
  }

  logFn(
    `- ${allIndices.length} total indices`,
    `- ${primaryIndices.length} primary indices`
  );

  const withAnalytics = (
    await getAnalytics(
      appClient,
      primaryIndices.map(({ name }) => name),
      logFn
    )
  ).sort((a, b) => b.count - a.count);

  const topIndices = withAnalytics.slice(0, MAX_TOP_INDICES);

  logFn(
    '\nSelected top indices:',
    topIndices
      .map(
        ({ index, count }) =>
          `- ${index} (${count.toLocaleString(
            'en-GB'
          )} searches in last 30 days)`
      )
      .join('\n')
  );

  return topIndices.map(({ index }) => index);
}

async function getQuerySuggestionsIndices(
  appClient: Algoliasearch,
  region: 'us' | 'eu' = 'us'
) {
  const client = appClient.initQuerySuggestions({ region });

  try {
    const configs = await client.getAllConfigs();
    return configs.map((config) => config.indexName);
  } catch (error) {
    // Rethrow error if we tried both regions
    if (region === 'eu') {
      throw error;
    }

    return getQuerySuggestionsIndices(appClient, 'eu');
  }
}

async function getAnalytics(
  appClient: Algoliasearch,
  indices: string[],
  logFn: (...lines: string[]) => void
) {
  const usClient = appClient.initAnalytics({ region: 'us' });
  const deClient = appClient.initAnalytics({ region: 'de' });

  let counter = 0;
  const total = indices.length;
  logFn(`\nFetching analytics for ${indices.length} indices…`);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  startDate.setHours(0, 0, 0, 0);

  const output = [];
  for (const index of indices) {
    counter++;

    try {
      logFn(`- [${padCounter(counter, total)}/${indices.length}] ${index}`);
      const [usAnalytics, deAnalytics] = await Promise.all([
        usClient.getSearchesCount({
          index,
          startDate: startDate.toISOString().split('T')[0],
        }),
        deClient.getSearchesCount({
          index,
          startDate: startDate.toISOString().split('T')[0],
        }),
      ]);

      output.push({
        index,
        count: Math.max(usAnalytics.count, deAnalytics.count),
      });
    } catch (e) {
      logFn(`- [${padCounter(counter, total)}/${indices.length}] ${String(e)}`);

      output.push({ index, count: -1 });
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return output;
}

async function getProductionIndices(
  appClient: Algoliasearch,
  allIndices: Awaited<ReturnType<typeof appClient.listIndices>>['items'],
  logFn = (...lines: string[]) => console.log(...lines)
) {
  if (!process.env.DASHBOARD_INTERNAL_API_KEY) {
    logFn('- ⚠️ DASHBOARD_INTERNAL_API_KEY not set');
    return [];
  }

  const request = await fetch(
    `https://www.algolia.com/api/internal/1/applications/${appClient.appId}?fields=production_indices,production_indices_auto_selection,production_indices_manual_selection`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Generative Relevance Evaluation (poc)',
        Authorization: `Basic ${process.env.DASHBOARD_INTERNAL_API_KEY}`,
      },
    }
  );

  const response = await request.json();
  const aggregatedProductionIndices = new Set<string>([
    ...response.production_indices,
    ...response.production_indices_auto_selection,
    ...response.production_indices_manual_selection,
  ]);

  const validProoductionIndices = aggregatedProductionIndices.intersection(
    new Set(allIndices.map((i) => i.name))
  );

  return [...validProoductionIndices];
}

function padCounter(count: number, total: number) {
  return count.toString().padStart(total.toString().length, '0');
}
