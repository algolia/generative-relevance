import { isCancel, log, select, text } from '@clack/prompts';
import { Algoliasearch, algoliasearch } from 'algoliasearch';
import { config } from 'dotenv';

config();

const algoliaClient = algoliasearch(
  process.env.APPS_APP_ID!,
  process.env.APPS_API_KEY!
);

async function start() {
  const appId = await text({
    message: 'App ID',
  });

  if (isCancel(appId)) {
    process.exit(0);
  }

  if (!appId) {
    return await start();
  }

  const personifiedId = await getPersonifiedId(appId);
  if (!personifiedId) {
    log.warn('This app cannot be personified.');
    return await start();
  }

  const adminApiKey = await text({
    message: `Admin API Key (https://dashboard.algolia.com/account/api-keys/all?_pid=${personifiedId}&applicationId=${appId})`,
    placeholder: 'qpsodjqspodjqspoqsjd',
  });
  if (isCancel(adminApiKey) || !adminApiKey) {
    return await start();
  }

  const appClient = algoliasearch(appId, adminApiKey);

  const targetIndex = await selectIndex(appClient);
  if (!targetIndex) {
    return await start();
  }

  const settings = await evaluateSettings(appClient, targetIndex);
  console.log(settings);

  // Display searchableAttributes + customRanking
  // Determine if relevant to run model, if so
  // - get search api key for app
  // - spawn child process
  // - go to next app

  return await start();
}

async function getPersonifiedId(appId: string) {
  const { results } = await algoliaClient.searchForHits<{
    user_can_be_personified: boolean;
    user_can_be_personified_id: number;
  }>({
    requests: [
      {
        indexName: 'applications_production',
        facetFilters: [`application_id:${appId}`],
      },
    ],
  });

  if (!results[0].hits.length || !results[0].hits[0].user_can_be_personified) {
    return undefined;
  }

  return results[0].hits[0].user_can_be_personified_id;
}

async function evaluateSettings(appClient: Algoliasearch, indexName: string) {
  const problems = [];

  const settings = await appClient.getSettings({ indexName });

  const DEFAULT_RANKING = [
    'typo',
    'geo',
    'words',
    'filters',
    'proximity',
    'attribute',
    'exact',
    'custom',
  ];

  if (!settings.searchableAttributes) {
    problems.push({
      text: 'No searchable attributes',
      critical: true,
    });
  }

  if (!settings.customRanking) {
    problems.push({
      text: 'No custom ranking',
      critical: true,
    });
  }

  const ranking = settings.ranking || [];

  if (!(DEFAULT_RANKING.join('') === ranking.join(''))) {
    const otherCriteria = [
      ...new Set(ranking).difference(new Set(DEFAULT_RANKING)),
    ];

    if (ranking.join('').indexOf(DEFAULT_RANKING.join('')) === -1) {
      problems.push({
        text: 'Ranking formula changed',
        data: ranking,
        critical: false,
      });
    }

    if (otherCriteria.length > 0) {
      problems.push({
        text: 'Other criteria present',
        data: otherCriteria,
        critical: false,
      });
    }
  }

  return problems;
}

async function selectIndex(appClient: Algoliasearch) {
  const indices = await appClient.listIndices({ hitsPerPage: 1000 });
  const primaryIndices = indices.items.filter((index) => !index.primary);
  // TODO:
  // - Call query suggestions API to remove them from list
  // - Call analytics / usage API to surface those that have more activities
  // - (try catch regions if necessary)

  const targetIndex = await select({
    message: 'Select index',
    options: primaryIndices
      .sort((a, b) => b.entries - a.entries)
      .map((index) => ({
        value: index.name,
        label: `${index.name} (${index.entries.toLocaleString(
          'en-GB'
        )} records)`,
      })),
  });

  return !isCancel(targetIndex) ? targetIndex : undefined;
}

start();
