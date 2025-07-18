import { Command } from 'commander';
import { validateEnvVars } from '../utils/validation';
import { generateConfigurations, ConfigurationOptions } from '../utils/generation';
import { displayComparison } from '../utils/display';
import { fetchAlgoliaData } from '../utils/algolia';

export interface CompareOptions extends ConfigurationOptions {
  limit: string;
  verbose?: boolean;
}

export function createCompareCommand(): Command {
  return new Command('compare')
    .description('Compare existing Algolia index settings with AI suggestions')
    .argument('<appId>', 'Algolia App ID')
    .argument('<apiKey>', 'Algolia Admin API Key')
    .argument('<indexName>', 'Algolia Index Name')
    .option('-l, --limit <number>', 'Number of records to analyze', '10')
    .option('-v, --verbose', 'Show detailed reasoning for each configuration')
    .option('--searchable', 'Compare searchable attributes only')
    .option('--ranking', 'Compare custom ranking only')
    .option('--faceting', 'Compare attributes for faceting only')
    .option('--sortable', 'Compare sortable attributes only')
    .action(async (
      appId: string,
      apiKey: string,
      indexName: string,
      options: CompareOptions
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

        const {
          searchableAttributes,
          customRanking,
          attributesForFaceting,
          sortableAttributes,
        } = await generateConfigurations(records, limit, options);

        console.log('\n🔄 Configuration Comparison\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (searchableAttributes) {
          displayComparison(
            '🔍 Searchable Attributes',
            currentSettings.searchableAttributes || [],
            searchableAttributes,
            verbose
          );
        }

        if (customRanking) {
          displayComparison(
            '📊 Custom Ranking',
            currentSettings.customRanking || [],
            customRanking,
            verbose
          );
        }

        if (attributesForFaceting) {
          displayComparison(
            '🏷️ Attributes for Faceting',
            currentSettings.attributesForFaceting || [],
            attributesForFaceting,
            verbose
          );
        }

        if (sortableAttributes) {
          displayComparison(
            '🔀 Sortable Attributes',
            currentSettings.sortableAttributes || [],
            sortableAttributes,
            verbose
          );
        }

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
    });
}