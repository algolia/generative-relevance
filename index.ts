#!/usr/bin/env tsx

import { config } from 'dotenv';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { Algoliasearch, algoliasearch, SettingsResponse } from 'algoliasearch';

import { generateSearchableAttributes } from './src/lib/generate-searchable-attributes';
import { generateCustomRanking } from './src/lib/generate-custom-ranking';
import { generateAttributesForFaceting } from './src/lib/generate-attributes-for-faceting';
import { generateSortByReplicas } from './src/lib/generate-sort-by-replicas';

config();

const program = new Command();

program
  .name('generative-relevance')
  .description(
    'CLI tool for testing AI-powered Algolia configuration generation'
  )
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze JSON records and generate AI configuration suggestions')
  .argument('<file>', 'Path to JSON file containing records')
  .option('-l, --limit <number>', 'Number of records to analyze', '10')
  .option('-v, --verbose', 'Show detailed reasoning for each configuration')
  .action(
    async (file: string, options: { limit: string; verbose?: boolean }) => {
      const startTime = Date.now();

      try {
        validateEnvVars();

        console.log('🔍 Loading records from:', file);

        const fileContent = readFileSync(file, 'utf-8');
        const records = JSON.parse(fileContent);

        if (!Array.isArray(records)) {
          console.error('❌ Error: JSON file must contain an array of records');
          process.exit(1);
        }

        const limit = parseInt(options.limit);

        console.log(
          `📊 Analyzing ${Math.min(records.length, limit)} records...\n`
        );

        const verbose = Boolean(options.verbose);

        if (verbose) {
          console.log('🔧 Verbose mode enabled - will show reasoning\n');
        }

        console.log('⚡ Generating AI configurations...');

        const [
          searchableAttributes,
          customRanking,
          attributesForFaceting,
          sortableAttributes,
        ] = await Promise.all([
          generateSearchableAttributes(records, limit),
          generateCustomRanking(records, limit),
          generateAttributesForFaceting(records, limit),
          generateSortByReplicas(records, limit),
        ]);

        console.log('\n🎯 AI Configuration Suggestions\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        displaySection(
          '🔍 Searchable Attributes',
          searchableAttributes,
          verbose
        );
        displaySection('📊 Custom Ranking', customRanking, verbose);
        displaySection(
          '🏷️  Attributes for Faceting',
          attributesForFaceting,
          verbose
        );
        displaySection('🔀 Sortable Attributes', sortableAttributes, verbose);

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log(`\n✅ Analysis complete! (took ${duration.toFixed(2)}s)`);
      } catch (err) {
        console.error(
          '❌ Error:',
          err instanceof Error ? err.message : 'Unknown error'
        );

        process.exit(1);
      }
    }
  );

program
  .command('compare')
  .description('Compare existing Algolia index settings with AI suggestions')
  .argument('<appId>', 'Algolia App ID')
  .argument('<apiKey>', 'Algolia Admin API Key')
  .argument('<indexName>', 'Algolia Index Name')
  .option('-l, --limit <number>', 'Number of records to analyze', '10')
  .option('-v, --verbose', 'Show detailed reasoning for each configuration')
  .action(
    async (
      appId: string,
      apiKey: string,
      indexName: string,
      options: { limit: string; verbose?: boolean }
    ) => {
      const startTime = Date.now();

      try {
        validateEnvVars();

        const verbose = Boolean(options.verbose);
        const limit = parseInt(options.limit);

        if (verbose) {
          console.log('🔧 Verbose mode enabled - will show reasoning\n');
        }

        console.log(
          `🔍 Fetching settings and records from index: ${indexName}`
        );

        const { currentSettings, records } = await fetchAlgoliaData(
          appId,
          apiKey,
          indexName,
          limit
        );

        console.log(
          `📊 Analyzing ${Math.min(records.length, limit)} records...\n`
        );

        console.log('⚡ Generating AI configurations...');

        const [
          searchableAttributes,
          customRanking,
          attributesForFaceting,
          sortableAttributes,
        ] = await Promise.all([
          generateSearchableAttributes(records, limit),
          generateCustomRanking(records, limit),
          generateAttributesForFaceting(records, limit),
          generateSortByReplicas(records, limit),
        ]);

        console.log('\n🔄 Configuration Comparison\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        displayComparison(
          '🔍 Searchable Attributes',
          currentSettings.searchableAttributes || [],
          searchableAttributes,
          verbose
        );

        displayComparison(
          '📊 Custom Ranking',
          currentSettings.customRanking || [],
          customRanking,
          verbose
        );

        displayComparison(
          '🏷️ Attributes for Faceting',
          currentSettings.attributesForFaceting || [],
          attributesForFaceting,
          verbose
        );

        displayComparison(
          '🔀 Sortable Attributes',
          currentSettings.sortableAttributes || [],
          sortableAttributes,
          verbose
        );

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`\n✅ Comparison complete! (took ${duration.toFixed(2)}s)`);
      } catch (err) {
        console.error(
          '❌ Error:',
          err instanceof Error ? err.message : 'Unknown error'
        );
        process.exit(1);
      }
    }
  );

program.parse();

function displaySection(
  title: string,
  config: {
    reasoning: string;
    searchableAttributes?: string[];
    customRanking?: string[];
    attributesForFaceting?: string[];
    sortableAttributes?: string[];
  },
  verbose: boolean
) {
  console.log(`${title}`);
  console.log('─'.repeat(50));

  const data =
    config.searchableAttributes ||
    config.customRanking ||
    config.attributesForFaceting ||
    config.sortableAttributes;

  if (data && data.length > 0) {
    data.forEach((attr: string, index: number) => {
      console.log(`  ${index + 1}. ${attr}`);
    });
  } else {
    console.log('  (No attributes suggested)');
  }

  if (verbose && config.reasoning) {
    console.log('\n💡 Reasoning:');
    const reasoningLines = config.reasoning.split('\n');

    reasoningLines.forEach((line: string) => {
      console.log(`  ${line}`);
    });
  } else if (verbose && !config.reasoning) {
    console.log('\n💡 No reasoning available for this section');
  }

  console.log('');
}

function displayComparison(
  title: string,
  currentConfig: string[],
  aiConfig: {
    reasoning: string;
    searchableAttributes?: string[];
    customRanking?: string[];
    attributesForFaceting?: string[];
    sortableAttributes?: string[];
  },
  verbose: boolean
) {
  console.log(`${title}`);
  console.log('━'.repeat(50));

  const aiData =
    aiConfig.searchableAttributes ||
    aiConfig.customRanking ||
    aiConfig.attributesForFaceting ||
    aiConfig.sortableAttributes;

  // Calculate column widths based on longest content
  const maxLength = Math.max(currentConfig.length, aiData?.length || 0);

  // Find the longest strings in each column
  let maxCurrentLength = '📍 CURRENT'.length;
  let maxSuggestedLength = '🤖 AI SUGGESTED'.length;

  for (let i = 0; i < maxLength; i++) {
    const current = currentConfig[i] || '';
    const suggested = aiData?.[i] || '';

    const currentWithNumber = `${i + 1}. ${current}`;
    const suggestedWithNumber = `${i + 1}. ${suggested}`;

    maxCurrentLength = Math.max(maxCurrentLength, currentWithNumber.length);
    maxSuggestedLength = Math.max(
      maxSuggestedLength,
      suggestedWithNumber.length
    );
  }

  // Add some padding
  maxCurrentLength += 2;
  maxSuggestedLength += 2;

  // Ensure minimum widths
  maxCurrentLength = Math.max(maxCurrentLength, 20);
  maxSuggestedLength = Math.max(maxSuggestedLength, 25);

  // Display side-by-side comparison
  console.log('');
  console.log(`${'📍 CURRENT'.padEnd(maxCurrentLength)}│ 🤖 AI SUGGESTED`);
  console.log(
    '─'.repeat(maxCurrentLength) + '┼' + '─'.repeat(maxSuggestedLength)
  );

  for (let i = 0; i < maxLength; i++) {
    const current = currentConfig[i] || '';
    const suggested = aiData?.[i] || '';

    const currentWithNumber = `${i + 1}. ${current}`;
    const suggestedWithNumber = `${i + 1}. ${suggested}`;

    console.log(
      `${currentWithNumber.padEnd(maxCurrentLength)}│ ${suggestedWithNumber}`
    );
  }

  if (currentConfig.length === 0) {
    console.log(`${'(No current config)'.padEnd(maxCurrentLength)}│ `);
  }

  if (!aiData || aiData.length === 0) {
    console.log(`${''.padEnd(maxCurrentLength)}│ (No AI suggestions)`);
  }

  // Show differences
  console.log('');
  const differences = findDifferences(currentConfig, aiData || []);
  if (differences.length > 0) {
    console.log('🔍 Key Differences:');
    differences.forEach((diff, index) => {
      console.log(`  ${index + 1}. ${diff}`);
    });
  } else {
    console.log('✅ Configurations match!');
  }

  if (verbose && aiConfig.reasoning) {
    console.log('\n💡 AI Reasoning:');
    const reasoningLines = aiConfig.reasoning.split('\n');
    reasoningLines.forEach((line: string) => {
      console.log(`  ${line}`);
    });
  } else if (verbose && !aiConfig.reasoning) {
    console.log('\n💡 No reasoning available for this section');
  }

  console.log('');
}

function findDifferences(current: string[], suggested: string[]): string[] {
  const differences: string[] = [];

  // Items in current but not in suggested
  const removedItems = current.filter((item) => !suggested.includes(item));
  if (removedItems.length > 0) {
    differences.push(`Removed: ${removedItems.join(', ')}`);
  }

  // Items in suggested but not in current
  const addedItems = suggested.filter((item) => !current.includes(item));
  if (addedItems.length > 0) {
    differences.push(`Added: ${addedItems.join(', ')}`);
  }

  // Order changes (if both have same items but different order)
  if (
    current.length === suggested.length &&
    current.every((item) => suggested.includes(item)) &&
    suggested.every((item) => current.includes(item)) &&
    current.join(',') !== suggested.join(',')
  ) {
    differences.push('Order changed');
  }

  return differences;
}

async function fetchAlgoliaData(
  appId: string,
  apiKey: string,
  indexName: string,
  limit: number
) {
  try {
    const client = algoliasearch(appId, apiKey);

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

function validateEnvVars() {
  const requiredVars = ['ANTHROPIC_API_KEY'];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease create a .env file with the required variables.');
    console.error('Example .env file:');
    console.error('ANTHROPIC_API_KEY=your_anthropic_api_key_here');
    process.exit(1);
  }
}
