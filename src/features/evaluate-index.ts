import type { Algoliasearch, SettingsResponse } from 'algoliasearch';

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

export async function evaluateIndex(
  appClient: Algoliasearch,
  indexName: string,
  logFn = (...lines: string[]) => console.log(...lines)
): Promise<{
  action: 'runModel' | 'prompt' | null;
  indexName: string;
  settings: SettingsResponse;
  problems?: Array<{ text: string; data?: any; critical: boolean }>;
}> {
  logFn(`\nEvaluating index ${indexName}…`);

  const problems = [];
  const settings = await appClient.getSettings({ indexName });

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
    logFn('- No issues found');
    return { action: null, indexName, settings };
  }

  if (problems.length > 0) {
    logFn(
      `- ${problems.length} issue(s) found:`,
      ...problems.map(
        (problem) =>
          `  * ${problem.text} ${problem.critical ? '(critical) ' : ''}\n    ${
            problem.data ? JSON.stringify(problem.data) : '\n'
          }`
      )
    );
  }

  if (problems.some(({ critical }) => critical)) {
    return { action: 'runModel', indexName, settings, problems };
  }

  return { action: 'prompt', indexName, settings, problems };
}
