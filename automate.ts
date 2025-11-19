import { confirm, isCancel, log, note, select, text } from '@clack/prompts';
import { Algoliasearch, algoliasearch, SettingsResponse } from 'algoliasearch';
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
  });
  if (isCancel(adminApiKey) || !adminApiKey) {
    return await start();
  }

  const appClient = algoliasearch(appId, adminApiKey);

  const targetIndex = await selectIndex(appClient);
  if (!targetIndex) {
    return await start();
  }

  const outcome = await evaluateIndex(appClient, targetIndex);
  if (outcome.action === 'runModel') {
    log.step('Critical opportunities detected, running model...');
    await runModel(appClient, targetIndex, outcome.settings);
  }

  if (!outcome.action) {
    log.info('No critical opportunities detected');
    return await start();
  }

  if (outcome.action === 'prompt') {
    const proceed = await confirm({
      message: 'Do you want to run the model to improve the index settings?',
      initialValue: false,
    });

    if (isCancel(proceed) || !proceed) {
      return await start();
    }

    log.step('Running model...');
    await runModel(appClient, targetIndex, outcome.settings);
  }

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

async function evaluateIndex(appClient: Algoliasearch, indexName: string) {
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

  if (problems.length === 0) {
    return { action: null, settings };
  }

  if (problems.some(({ critical }) => critical)) {
    note(`
${problems.length} issues found:\n
${problems
  .map(
    (problem) =>
      `* ${problem.critical ? '(!) ' : ''}${problem.text}\n${JSON.stringify(
        problem.data,
        null,
        2
      )}`
  )
  .join('\n\n')}
`);

    return { action: 'runModel', settings };
  }

  return { action: 'prompt', settings };
}

async function runModel(
  appClient: Algoliasearch,
  indexName: string,
  currentSettings: SettingsResponse
) {
  const searchApiKey = (await appClient.listApiKeys()).keys.find(
    (key) =>
      key.acl.length === 1 &&
      key.acl[0] === 'search' &&
      !key.indexes &&
      !key.referers &&
      key.description === 'Search-only API Key'
  );

  if (!searchApiKey) {
    log.error(`Could not find Search-only API Key for ${appClient.appId}`);
    return await start();
  }

  //   TODO:
  // - spawn child process
}

async function selectIndex(appClient: Algoliasearch) {
  const indices = await appClient.listIndices({ hitsPerPage: 1000 });
  const qsIndices = await getQuerySuggestionsIndices(appClient);
  const primaryIndices = indices.items.filter(
    (index) => !index.primary && !qsIndices.includes(index.name)
  );

  // TODO:
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
  region: 'us' | 'de' = 'us'
) {
  const client = appClient.initAnalytics({ region });
  client.addAlgoliaAgent('poc_generative_relevance_cli');

  try {
    // const first = await client.getSearchesCount({
    //   index: indices[0],
    // });
    // const rest = await Promise.all(
    //   indices
    //     .slice(1)
    //     .map((index) => client.getSearchesCount({ index }))
    // );
    // return [first, ...rest];
  } catch (error) {
    // Rethrow error if we tried both regions
    if (region === 'de') {
      throw error;
    }

    return getAnalytics(appClient, indices, 'de');
  }
}

start();
