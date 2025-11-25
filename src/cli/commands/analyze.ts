import { Command } from 'commander';
import { ConfigurationOptions } from '../utils/generation';
import { displaySection, displayDualModelComparison } from '../utils/display';
import { getCliCostSummary } from '../../lib';
import { formatCostSummary } from '../utils/format-cost-summary';
import {
  promptAnalyzeResults,
  promptApplyConfiguration,
  ConfigurationSection,
  InteractiveOptions,
} from '../utils/interactive';
import {
  analyze,
  AnalyzeInput,
  AnalyzeResult,
  DualModelAnalyzeResult,
} from '../../features/analyze';

export interface AnalyzeOptions extends ConfigurationOptions {
  limit: string;
  verbose?: boolean;
  model?: string;
  compareModels?: string;
  interactive?: boolean;
}

export function createAnalyzeCommand(): Command {
  return new Command('analyze')
    .description(
      'Analyze JSON records or Algolia index and generate AI configuration suggestions'
    )
    .argument(
      '<source>',
      'Path to JSON file OR Algolia App ID (use with --api-key and --index)'
    )
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
    .option(
      '-i, --interactive',
      'Enable interactive mode to apply configurations'
    )
    .action(
      async (
        source: string,
        options: AnalyzeOptions & { apiKey?: string; index?: string }
      ) => {
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

          // Determine if we're analyzing a file or an Algolia index
          const isAlgoliaMode = Boolean(options.apiKey && options.index);

          if (isAlgoliaMode && (!options.apiKey || !options.index)) {
            throw new Error(
              'Both --api-key and --index are required when using Algolia mode'
            );
          }

          const limit = parseInt(options.limit);
          const verbose = Boolean(options.verbose);

          // Log initial status
          if (isAlgoliaMode) {
            console.log(
              `🔍 Analyzing index "${options.index}" from app "${source}"...`
            );
            console.log(`📥 Fetching ${limit} records from index...`);
          } else {
            console.log('🔍 Loading records from:', source);
          }

          // Prepare input for analyze function
          const analyzeInput: AnalyzeInput = {
            source,
            apiKey: options.apiKey,
            indexName: options.index,
            limit,
            model: model1!,
            compareModel: model2,
            options: {
              searchable: options.searchable,
              ranking: options.ranking,
              faceting: options.faceting,
              sortable: options.sortable,
            },
          };

          // Run analysis
          const result = await analyze(analyzeInput);

          if (isAlgoliaMode && 'recordsAnalyzed' in result) {
            console.log(`✅ Retrieved ${result.recordsAnalyzed} records`);
          }

          console.log(`📊 Analyzing ${result.recordsAnalyzed} records...\n`);

          if (verbose) {
            console.log('🔧 Verbose mode enabled - will show reasoning\n');
          }

          // Display results based on type
          if ('model2' in result) {
            // Dual-model comparison result
            const dualResult = result as DualModelAnalyzeResult;

            console.log(
              `⚡ Generating AI configurations with dual-model comparison: ${dualResult.model1} vs ${dualResult.model2}...`
            );

            console.log('\n🎯 Model Comparison Results\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            // Display dual-model comparisons
            if (
              dualResult.results1.searchableAttributes ||
              dualResult.results2.searchableAttributes
            ) {
              displayDualModelComparison(
                '🔍 Searchable Attributes',
                dualResult.results1.searchableAttributes
                  ? {
                      searchableAttributes:
                        dualResult.results1.searchableAttributes
                          .searchableAttributes,
                      attributeReasons:
                        dualResult.results1.searchableAttributes
                          .attributeReasons,
                      reasoning:
                        dualResult.results1.searchableAttributes.reasoning,
                    }
                  : null,
                dualResult.results2.searchableAttributes
                  ? {
                      searchableAttributes:
                        dualResult.results2.searchableAttributes
                          .searchableAttributes,
                      attributeReasons:
                        dualResult.results2.searchableAttributes
                          .attributeReasons,
                      reasoning:
                        dualResult.results2.searchableAttributes.reasoning,
                    }
                  : null,
                dualResult.model1,
                dualResult.model2,
                verbose
              );
            }
            if (
              dualResult.results1.customRanking ||
              dualResult.results2.customRanking
            ) {
              displayDualModelComparison(
                '📊 Custom Ranking',
                dualResult.results1.customRanking
                  ? {
                      customRanking:
                        dualResult.results1.customRanking.customRanking,
                      attributeReasons:
                        dualResult.results1.customRanking.attributeReasons,
                      reasoning: dualResult.results1.customRanking.reasoning,
                    }
                  : null,
                dualResult.results2.customRanking
                  ? {
                      customRanking:
                        dualResult.results2.customRanking.customRanking,
                      attributeReasons:
                        dualResult.results2.customRanking.attributeReasons,
                      reasoning: dualResult.results2.customRanking.reasoning,
                    }
                  : null,
                dualResult.model1,
                dualResult.model2,
                verbose
              );
            }
            if (
              dualResult.results1.attributesForFaceting ||
              dualResult.results2.attributesForFaceting
            ) {
              displayDualModelComparison(
                '🏷️  Attributes for Faceting',
                dualResult.results1.attributesForFaceting
                  ? {
                      attributesForFaceting:
                        dualResult.results1.attributesForFaceting
                          .attributesForFaceting,
                      attributeReasons:
                        dualResult.results1.attributesForFaceting
                          .attributeReasons,
                      reasoning:
                        dualResult.results1.attributesForFaceting.reasoning,
                    }
                  : null,
                dualResult.results2.attributesForFaceting
                  ? {
                      attributesForFaceting:
                        dualResult.results2.attributesForFaceting
                          .attributesForFaceting,
                      attributeReasons:
                        dualResult.results2.attributesForFaceting
                          .attributeReasons,
                      reasoning:
                        dualResult.results2.attributesForFaceting.reasoning,
                    }
                  : null,
                dualResult.model1,
                dualResult.model2,
                verbose
              );
            }
            if (
              dualResult.results1.sortableAttributes ||
              dualResult.results2.sortableAttributes
            ) {
              displayDualModelComparison(
                '🔀 Sortable Attributes',
                dualResult.results1.sortableAttributes
                  ? {
                      sortableAttributes:
                        dualResult.results1.sortableAttributes
                          .sortableAttributes,
                      attributeReasons:
                        dualResult.results1.sortableAttributes.attributeReasons,
                      reasoning:
                        dualResult.results1.sortableAttributes.reasoning,
                    }
                  : null,
                dualResult.results2.sortableAttributes
                  ? {
                      sortableAttributes:
                        dualResult.results2.sortableAttributes
                          .sortableAttributes,
                      attributeReasons:
                        dualResult.results2.sortableAttributes.attributeReasons,
                      reasoning:
                        dualResult.results2.sortableAttributes.reasoning,
                    }
                  : null,
                dualResult.model1,
                dualResult.model2,
                verbose
              );
            }
          } else {
            // Single model analysis result
            const singleResult = result as AnalyzeResult;

            console.log('⚡ Generating AI configurations...');

            console.log('\n🎯 AI Configuration Suggestions\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            if (singleResult.searchableAttributes) {
              displaySection(
                '🔍 Searchable Attributes',
                {
                  searchableAttributes:
                    singleResult.searchableAttributes.searchableAttributes,
                  attributeReasons:
                    singleResult.searchableAttributes.attributeReasons,
                  reasoning: singleResult.searchableAttributes.reasoning,
                },
                verbose
              );
            }
            if (singleResult.customRanking) {
              displaySection(
                '📊 Custom Ranking',
                {
                  customRanking: singleResult.customRanking.customRanking,
                  attributeReasons: singleResult.customRanking.attributeReasons,
                  reasoning: singleResult.customRanking.reasoning,
                },
                verbose
              );
            }
            if (singleResult.attributesForFaceting) {
              displaySection(
                '🏷️  Attributes for Faceting',
                {
                  attributesForFaceting:
                    singleResult.attributesForFaceting.attributesForFaceting,
                  attributeReasons:
                    singleResult.attributesForFaceting.attributeReasons,
                  reasoning: singleResult.attributesForFaceting.reasoning,
                },
                verbose
              );
            }
            if (singleResult.sortableAttributes) {
              displaySection(
                '🔀 Sortable Attributes',
                {
                  sortableAttributes:
                    singleResult.sortableAttributes.sortableAttributes,
                  attributeReasons:
                    singleResult.sortableAttributes.attributeReasons,
                  reasoning: singleResult.sortableAttributes.reasoning,
                },
                verbose
              );
            }
          }

          console.log(
            `\n✅ Analysis complete! (took ${result.duration.toFixed(2)}s)`
          );

          // Display cost summary
          console.log(formatCostSummary(getCliCostSummary()));

          // Handle interactive mode
          if (options.interactive && !model2) {
            // Prepare configuration sections for interactive mode
            const configSections: ConfigurationSection[] = [];

            // Re-generate configurations for interactive mode if needed
            const singleResult = result as AnalyzeResult;
            const {
              searchableAttributes,
              customRanking,
              attributesForFaceting,
              sortableAttributes,
            } = singleResult;

            if (searchableAttributes) {
              configSections.push({
                title: '🔍 Searchable Attributes',
                type: 'searchableAttributes',
                config: searchableAttributes.searchableAttributes,
                reasoning: searchableAttributes.reasoning,
                attributeReasons: searchableAttributes.attributeReasons,
              });
            }

            if (customRanking) {
              configSections.push({
                title: '📊 Custom Ranking',
                type: 'customRanking',
                config: customRanking.customRanking,
                reasoning: customRanking.reasoning,
                attributeReasons: customRanking.attributeReasons,
              });
            }

            if (attributesForFaceting) {
              configSections.push({
                title: '🏷️  Attributes for Faceting',
                type: 'attributesForFaceting',
                config: attributesForFaceting.attributesForFaceting,
                reasoning: attributesForFaceting.reasoning,
                attributeReasons: attributesForFaceting.attributeReasons,
              });
            }

            if (sortableAttributes) {
              configSections.push({
                title: '🔀 Sortable Attributes',
                type: 'sortableAttributes',
                config: sortableAttributes.sortableAttributes,
                reasoning: sortableAttributes.reasoning,
                attributeReasons: sortableAttributes.attributeReasons,
              });
            }

            if (configSections.length > 0) {
              const { shouldApply, credentials } = await promptAnalyzeResults(
                isAlgoliaMode
              );

              if (shouldApply) {
                const interactiveOptions: InteractiveOptions = isAlgoliaMode
                  ? {
                      appId: source,
                      apiKey: options.apiKey!,
                      indexName: options.index!,
                    }
                  : credentials!;

                await promptApplyConfiguration(
                  configSections,
                  interactiveOptions
                );
              }
            }
          } else if (options.interactive && model2) {
            console.log(
              '\n⚠️  Interactive mode is not supported with dual-model comparison.'
            );
            console.log(
              'Please run without --compare-models to use interactive features.'
            );
          }
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
