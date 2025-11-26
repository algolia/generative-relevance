import { Algoliasearch, algoliasearch, SettingsResponse } from 'algoliasearch';

export { algoliasearch as searchClient };

export async function fetchAlgoliaAppInfo(
  client: Algoliasearch,
  appId: string
) {
  const { results } = await client.searchForHits<{
    name?: string;
    user_can_be_personified: boolean;
    user_can_be_personified_id: number;
    user_email: string;
  }>({
    requests: [
      {
        indexName: 'applications_production',
        facetFilters: [`application_id:${appId}`],
      },
    ],
  });

  const hit = results[0].hits[0];
  if (!hit) {
    throw new Error(`No application found with id ${appId}`);
  }

  return hit;
}

export async function fetchAlgoliaSearchApiKey(client: Algoliasearch) {
  const result = (await client.listApiKeys()).keys.find(
    (key) =>
      (key.acl.length === 1 &&
        key.acl[0] === 'search' &&
        !key.indexes &&
        !key.referers &&
        key.description === 'Search-only API Key') ||
      key.description?.startsWith('Search API Key for')
  );

  if (!result) {
    throw new Error('No search-only API key found');
  }

  return result.value;
}

export async function fetchAlgoliaData(
  appId: string,
  apiKey: string,
  indexName: string,
  limit: number,
  logFn = (...lines: string[]) => console.log(...lines)
) {
  try {
    const client = algoliasearch(appId, apiKey);

    try {
      logFn('  📋 Fetching index settings...');
      const settings = await client.getSettings({ indexName });

      logFn('  📄 Fetching sample records...');
      const searchResult = await client.searchSingleIndex({
        indexName,
        searchParams: {
          query: '',
          hitsPerPage: limit,
          attributesToRetrieve: ['*'],
        },
      });

      logFn('  🔀 Fetching replicas for sortable attributes...');
      const sortableAttributes = await getSortableAttributesFromReplicas(
        client,
        settings,
        logFn
      );

      return {
        currentSettings: {
          ...settings,
          sortableAttributes,
        },
        records: searchResult.hits,
      };
    } catch (e) {
      logFn('  📄 Fetching sample records...');
      const searchResult = await client.searchSingleIndex({
        indexName,
        searchParams: {
          query: '',
          hitsPerPage: limit,
          attributesToRetrieve: ['*'],
        },
      });

      return {
        currentSettings: {},
        records: searchResult.hits,
      };
    }
  } catch (error) {
    throw new Error(
      `Failed to fetch data from Algolia: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

async function getSortableAttributesFromReplicas(
  client: Algoliasearch,
  settings: SettingsResponse,
  logFn = (...lines: string[]) => console.log(...lines)
) {
  const sortableAttributes: string[] = [];

  if (settings.replicas && settings.replicas.length > 0) {
    logFn(
      `    📊 Found ${settings.replicas.length} replicas, checking their rankings...`
    );

    for (const replicaName of settings.replicas) {
      try {
        const replicaSettings = await client.getSettings({
          indexName: replicaName,
        });

        if (replicaSettings.ranking && replicaSettings.ranking.length > 0) {
          const mainRanking = settings.ranking || [];
          const replicaRanking = replicaSettings.ranking;

          if (JSON.stringify(mainRanking) !== JSON.stringify(replicaRanking)) {
            const firstRankingCriterion = replicaRanking[0];

            if (
              firstRankingCriterion &&
              (firstRankingCriterion.startsWith('asc(') ||
                firstRankingCriterion.startsWith('desc('))
            ) {
              sortableAttributes.push(firstRankingCriterion);
            }
          }
        }
      } catch (err) {
        logFn(`    ⚠️  Could not fetch settings for replica: ${replicaName}`);
      }
    }
  } else {
    logFn('    📊 No replicas found');
  }

  return sortableAttributes;
}
