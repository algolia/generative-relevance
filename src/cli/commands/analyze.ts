import { Command } from 'commander';
import { readFileSync } from 'fs';
import { validateEnvVars, validateJsonFile } from '../utils/validation';
import {
  generateConfigurations,
  ConfigurationOptions,
} from '../utils/generation';
import { displaySection, displayDualModelComparison } from '../utils/display';
import { getCliCostSummary } from '../../lib';
import { formatCostSummary } from '../utils/format-cost-summary';
import { fetchAlgoliaData } from '../utils/algolia';

export interface AnalyzeOptions extends ConfigurationOptions {
  limit: string;
  verbose?: boolean;
  model?: string;
  compareModels?: string;
}

export function createAnalyzeCommand(): Command {
  return new Command('analyze')
    .description(
      'Analyze JSON records or Algolia index and generate AI configuration suggestions'
    )
    .argument('<source>', 'Path to JSON file OR Algolia App ID (use with --api-key and --index)')
    .option('--api-key <key>', 'Algolia Admin API Key (required with --index)')
    .option('--index <name>', 'Algolia Index Name (required with --api-key)')
    .option('-l, --limit <number>', 'Number of records to analyze', '10')
    .option('-v, --verbose', 'Show detailed reasoning for each configuration')
    .option('--searchable', 'Generate searchable attributes only')
    .option('--ranking', 'Generate custom ranking only')
    .option('--faceting', 'Generate attributes for faceting only')
    .option('--sortable', 'Generate sortable attributes only')
    .option(
      '-m, --model <model>',
      'AI model to use (claude-3-5-haiku-latest, claude-3-5-sonnet-latest, gpt-4.1-nano)',
      'claude-3-5-haiku-latest'
    )
    .option(
      '--compare-models <models>',
      'Compare two models (format: model1,model2)'
    )
    .action(async (source: string, options: AnalyzeOptions & { apiKey?: string; index?: string }) => {
      const startTime = Date.now();

      try {
        // Parse models for dual-model comparison
        let model1 = options.model;
        let model2: string | undefined;

        if (options.compareModels) {
          const models = options.compareModels.split(',').map((m) => m.trim());
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

        // Determine if we're analyzing a file or an Algolia index
        const isAlgoliaMode = Boolean(options.apiKey && options.index);
        
        if (isAlgoliaMode && (!options.apiKey || !options.index)) {
          throw new Error('Both --api-key and --index are required when using Algolia mode');
        }

        let records: any[];

        if (isAlgoliaMode) {
          console.log(`🔍 Analyzing index "${options.index}" from app "${source}"...`);
          
          const limit = parseInt(options.limit);
          console.log(`📥 Fetching ${limit} records from index...`);
          
          const { records: algoliaRecords } = await fetchAlgoliaData(source, options.apiKey!, options.index!, limit);
          
          if (algoliaRecords.length === 0) {
            throw new Error('No records found in the index');
          }
          
          records = algoliaRecords;
          console.log(`✅ Retrieved ${records.length} records`);
        } else {
          console.log('🔍 Loading records from:', source);
          
          const fileContent = readFileSync(source, 'utf-8');
          records = validateJsonFile(fileContent);
        }

        const limit = parseInt(options.limit);
        const verbose = Boolean(options.verbose);

        console.log(
          `📊 Analyzing ${Math.min(records.length, limit)} records...\n`
        );

        if (verbose) {
          console.log('🔧 Verbose mode enabled - will show reasoning\n');
        }

        if (model2) {
          console.log(
            `⚡ Generating AI configurations with dual-model comparison: ${model1} vs ${model2}...`
          );

          // Run both models in parallel
          const [results1, results2] = await Promise.all([
            generateConfigurations(records, limit, options, model1),
            generateConfigurations(records, limit, options, model2),
          ]);

          console.log('\n🎯 Model Comparison Results\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          // Display dual-model comparisons
          if (results1.searchableAttributes || results2.searchableAttributes) {
            displayDualModelComparison(
              '🔍 Searchable Attributes',
              results1.searchableAttributes ? {
                searchableAttributes: results1.searchableAttributes.searchableAttributes,
                attributeReasons: results1.searchableAttributes.attributeReasons,
                reasoning: results1.searchableAttributes.reasoning
              } : null,
              results2.searchableAttributes ? {
                searchableAttributes: results2.searchableAttributes.searchableAttributes,
                attributeReasons: results2.searchableAttributes.attributeReasons,
                reasoning: results2.searchableAttributes.reasoning
              } : null,
              model1!,
              model2,
              verbose
            );
          }
          if (results1.customRanking || results2.customRanking) {
            displayDualModelComparison(
              '📊 Custom Ranking',
              results1.customRanking ? {
                customRanking: results1.customRanking.customRanking,
                attributeReasons: results1.customRanking.attributeReasons,
                reasoning: results1.customRanking.reasoning
              } : null,
              results2.customRanking ? {
                customRanking: results2.customRanking.customRanking,
                attributeReasons: results2.customRanking.attributeReasons,
                reasoning: results2.customRanking.reasoning
              } : null,
              model1!,
              model2,
              verbose
            );
          }
          if (
            results1.attributesForFaceting ||
            results2.attributesForFaceting
          ) {
            displayDualModelComparison(
              '🏷️  Attributes for Faceting',
              results1.attributesForFaceting ? {
                attributesForFaceting: results1.attributesForFaceting.attributesForFaceting,
                attributeReasons: results1.attributesForFaceting.attributeReasons,
                reasoning: results1.attributesForFaceting.reasoning
              } : null,
              results2.attributesForFaceting ? {
                attributesForFaceting: results2.attributesForFaceting.attributesForFaceting,
                attributeReasons: results2.attributesForFaceting.attributeReasons,
                reasoning: results2.attributesForFaceting.reasoning
              } : null,
              model1!,
              model2,
              verbose
            );
          }
          if (results1.sortableAttributes || results2.sortableAttributes) {
            displayDualModelComparison(
              '🔀 Sortable Attributes',
              results1.sortableAttributes ? {
                sortableAttributes: results1.sortableAttributes.sortableAttributes,
                attributeReasons: results1.sortableAttributes.attributeReasons,
                reasoning: results1.sortableAttributes.reasoning
              } : null,
              results2.sortableAttributes ? {
                sortableAttributes: results2.sortableAttributes.sortableAttributes,
                attributeReasons: results2.sortableAttributes.attributeReasons,
                reasoning: results2.sortableAttributes.reasoning
              } : null,
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

          console.log('\n🎯 AI Configuration Suggestions\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          if (searchableAttributes) {
            displaySection(
              '🔍 Searchable Attributes',
              {
                searchableAttributes: searchableAttributes.searchableAttributes,
                attributeReasons: searchableAttributes.attributeReasons,
                reasoning: searchableAttributes.reasoning
              },
              verbose
            );
          }
          if (customRanking) {
            displaySection(
              '📊 Custom Ranking', 
              {
                customRanking: customRanking.customRanking,
                attributeReasons: customRanking.attributeReasons,
                reasoning: customRanking.reasoning
              },
              verbose
            );
          }
          if (attributesForFaceting) {
            displaySection(
              '🏷️  Attributes for Faceting',
              {
                attributesForFaceting: attributesForFaceting.attributesForFaceting,
                attributeReasons: attributesForFaceting.attributeReasons,
                reasoning: attributesForFaceting.reasoning
              },
              verbose
            );
          }
          if (sortableAttributes) {
            displaySection(
              '🔀 Sortable Attributes',
              {
                sortableAttributes: sortableAttributes.sortableAttributes,
                attributeReasons: sortableAttributes.attributeReasons,
                reasoning: sortableAttributes.reasoning
              },
              verbose
            );
          }
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log(`\n✅ Analysis complete! (took ${duration.toFixed(2)}s)`);

        // Display cost summary
        console.log(formatCostSummary(getCliCostSummary()));
      } catch (err) {
        console.error(
          '❌ Error:',
          err instanceof Error ? err.message : 'Unknown error'
        );
        process.exit(1);
      }
    });
}
