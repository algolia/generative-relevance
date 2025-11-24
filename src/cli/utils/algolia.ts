import { Algoliasearch, algoliasearch, SettingsResponse } from 'algoliasearch';

export { algoliasearch as searchClient };

export async function getAlgoliaAppInfo(client: Algoliasearch, appId: string) {
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

export async function fetchAlgoliaData(
  appId: string,
  apiKey: string,
  indexName: string,
  limit: number
) {
  try {
    const client = algoliasearch(appId, apiKey);

    try {
      console.log('  📋 Fetching index settings...');
      const settings = await client.getSettings({ indexName });

      console.log('  📄 Fetching sample records...');
      const searchResult = await client.searchSingleIndex({
        indexName,
        searchParams: {
          query: '',
          hitsPerPage: limit,
          attributesToRetrieve: ['*'],
        },
      });

      console.log('  🔀 Fetching replicas for sortable attributes...');
      const sortableAttributes = await getSortableAttributesFromReplicas(
        client,
        settings
      );

      return {
        currentSettings: {
          ...settings,
          sortableAttributes,
        },
        records: searchResult.hits,
      };
    } catch (e) {
      console.log('  📄 Fetching sample records...');
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
  settings: SettingsResponse
) {
  const sortableAttributes: string[] = [];

  if (settings.replicas && settings.replicas.length > 0) {
    console.log(
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
        console.log(
          `    ⚠️  Could not fetch settings for replica: ${replicaName}`
        );
      }
    }
  } else {
    console.log('    📊 No replicas found');
  }

  return sortableAttributes;
}
