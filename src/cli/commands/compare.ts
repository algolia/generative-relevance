import { Command } from 'commander';
import { validateEnvVars } from '../utils/validation';
import {
  generateConfigurations,
  ConfigurationOptions,
} from '../utils/generation';
import {
  displayComparison,
  displayDualModelComparison,
  displayTripleComparison,
} from '../utils/display';
import { fetchAlgoliaData } from '../utils/algolia';

export interface CompareOptions extends ConfigurationOptions {
  limit: string;
  verbose?: boolean;
  model?: string;
  compareModels?: string;
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
    .option(
      '-m, --model <model>',
      'AI model to use (claude-3-5-haiku-latest, claude-3-5-sonnet-latest, o3-mini)',
      'claude-3-5-haiku-latest'
    )
    .option(
      '--compare-models <models>',
      'Compare two models (format: model1,model2)'
    )
    .action(
      async (
        appId: string,
        apiKey: string,
        indexName: string,
        options: CompareOptions
      ) => {
        const startTime = Date.now();

        try {
          // Parse models for dual-model comparison
          let model1 = options.model;
          let model2: string | undefined;

          if (options.compareModels) {
            const models = options.compareModels
              .split(',')
              .map((m) => m.trim());
            if (models.length !== 2) {
              throw new Error(
                '--compare-models must specify exactly two models (format: model1,model2)'
              );
            }
            [model1, model2] = models;
          }

          // Validate API keys for all models being used
          validateEnvVars(model1);
          if (model2) {
            validateEnvVars(model2);
          }

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

          if (model2) {
            console.log(
              `⚡ Generating AI configurations with dual-model comparison: ${model1} vs ${model2}...`
            );

            // Run both models in parallel
            const [results1, results2] = await Promise.all([
              generateConfigurations(records, limit, options, model1),
              generateConfigurations(records, limit, options, model2),
            ]);

            console.log('\n🔄 Triple Configuration Comparison\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            // Display triple comparisons (Current vs Model1 vs Model2)
            if (
              results1.searchableAttributes ||
              results2.searchableAttributes
            ) {
              displayTripleComparison(
                '🔍 Searchable Attributes',
                currentSettings.searchableAttributes || [],
                results1.searchableAttributes,
                results2.searchableAttributes,
                model1!,
                model2,
                verbose
              );
            }
            if (results1.customRanking || results2.customRanking) {
              displayTripleComparison(
                '📊 Custom Ranking',
                currentSettings.customRanking || [],
                results1.customRanking,
                results2.customRanking,
                model1!,
                model2,
                verbose
              );
            }
            if (
              results1.attributesForFaceting ||
              results2.attributesForFaceting
            ) {
              displayTripleComparison(
                '🏷️ Attributes for Faceting',
                currentSettings.attributesForFaceting || [],
                results1.attributesForFaceting,
                results2.attributesForFaceting,
                model1!,
                model2,
                verbose
              );
            }
            if (results1.sortableAttributes || results2.sortableAttributes) {
              displayTripleComparison(
                '🔀 Sortable Attributes',
                currentSettings.sortableAttributes || [],
                results1.sortableAttributes,
                results2.sortableAttributes,
                model1!,
                model2,
                verbose
              );
            }
          } else {
            console.log('⚡ Generating AI configurations...');

            const {
              searchableAttributes,
              customRanking,
              attributesForFaceting,
              sortableAttributes,
            } = await generateConfigurations(records, limit, options, model1);

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
          }

          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;

          console.log(
            `\n✅ Comparison complete! (took ${duration.toFixed(2)}s)`
          );
        } catch (err) {
          console.error(
            '❌ Error:',
            err instanceof Error ? err.message : 'Unknown error'
          );
          process.exit(1);
        }
      }
    );
}
