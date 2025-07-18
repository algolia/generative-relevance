import { Command } from 'commander';
import { readFileSync } from 'fs';
import { validateEnvVars, validateJsonFile } from '../utils/validation';
import { generateConfigurations, ConfigurationOptions } from '../utils/generation';
import { displaySection } from '../utils/display';

export interface AnalyzeOptions extends ConfigurationOptions {
  limit: string;
  verbose?: boolean;
  model?: string;
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
    .action(async (file: string, options: AnalyzeOptions) => {
      const startTime = Date.now();

      try {
        validateEnvVars(options.model);

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

        console.log('⚡ Generating AI configurations...');

        const {
          searchableAttributes,
          customRanking,
          attributesForFaceting,
          sortableAttributes,
        } = await generateConfigurations(records, limit, options, options.model);

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