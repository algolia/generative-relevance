import { Command } from 'commander';
import { readFileSync } from 'fs';
import { validateEnvVars, validateJsonFile } from '../utils/validation';
import { generateConfigurations, ConfigurationOptions } from '../utils/generation';
import { displaySection, displayDualModelComparison } from '../utils/display';

export interface AnalyzeOptions extends ConfigurationOptions {
  limit: string;
  verbose?: boolean;
  model?: string;
  compareModels?: string;
}

export function createAnalyzeCommand(): Command {
  return new Command('analyze')
    .description('Analyze JSON records and generate AI configuration suggestions')
    .argument('<file>', 'Path to JSON file containing records')
    .option('-l, --limit <number>', 'Number of records to analyze', '10')
    .option('-v, --verbose', 'Show detailed reasoning for each configuration')
    .option('--searchable', 'Generate searchable attributes only')
    .option('--ranking', 'Generate custom ranking only')
    .option('--faceting', 'Generate attributes for faceting only')
    .option('--sortable', 'Generate sortable attributes only')
    .option('-m, --model <model>', 'AI model to use (claude-3-5-haiku-latest, claude-3-5-sonnet-latest, claude-3-opus-latest, o3-mini)', 'claude-3-5-haiku-latest')
    .option('--compare-models <models>', 'Compare two models (format: model1,model2)')
    .action(async (file: string, options: AnalyzeOptions) => {
      const startTime = Date.now();

      try {
        // Parse models for dual-model comparison
        let model1 = options.model;
        let model2: string | undefined;
        
        if (options.compareModels) {
          const models = options.compareModels.split(',').map(m => m.trim());
          if (models.length !== 2) {
            throw new Error('--compare-models must specify exactly two models (format: model1,model2)');
          }
          [model1, model2] = models;
        }

        // Validate API keys for all models being used
        validateEnvVars(model1);
        if (model2) {
          validateEnvVars(model2);
        }

        console.log('🔍 Loading records from:', file);

        const fileContent = readFileSync(file, 'utf-8');
        const records = validateJsonFile(fileContent);

        const limit = parseInt(options.limit);
        const verbose = Boolean(options.verbose);

        console.log(
          `📊 Analyzing ${Math.min(records.length, limit)} records...\n`
        );

        if (verbose) {
          console.log('🔧 Verbose mode enabled - will show reasoning\n');
        }

        if (model2) {
          console.log(`⚡ Generating AI configurations with dual-model comparison: ${model1} vs ${model2}...`);
          
          // Run both models in parallel
          const [results1, results2] = await Promise.all([
            generateConfigurations(records, limit, options, model1),
            generateConfigurations(records, limit, options, model2)
          ]);

          console.log('\n🎯 Model Comparison Results\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          // Display dual-model comparisons
          if (results1.searchableAttributes || results2.searchableAttributes) {
            displayDualModelComparison(
              '🔍 Searchable Attributes',
              results1.searchableAttributes,
              results2.searchableAttributes,
              model1!,
              model2,
              verbose
            );
          }
          if (results1.customRanking || results2.customRanking) {
            displayDualModelComparison(
              '📊 Custom Ranking',
              results1.customRanking,
              results2.customRanking,
              model1!,
              model2,
              verbose
            );
          }
          if (results1.attributesForFaceting || results2.attributesForFaceting) {
            displayDualModelComparison(
              '🏷️  Attributes for Faceting',
              results1.attributesForFaceting,
              results2.attributesForFaceting,
              model1!,
              model2,
              verbose
            );
          }
          if (results1.sortableAttributes || results2.sortableAttributes) {
            displayDualModelComparison(
              '🔀 Sortable Attributes',
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

          console.log('\n🎯 AI Configuration Suggestions\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          if (searchableAttributes) {
            displaySection(
              '🔍 Searchable Attributes',
              searchableAttributes,
              verbose
            );
          }
          if (customRanking) {
            displaySection('📊 Custom Ranking', customRanking, verbose);
          }
          if (attributesForFaceting) {
            displaySection(
              '🏷️  Attributes for Faceting',
              attributesForFaceting,
              verbose
            );
          }
          if (sortableAttributes) {
            displaySection('🔀 Sortable Attributes', sortableAttributes, verbose);
          }
        }

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
    });
}