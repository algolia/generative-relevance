#!/usr/bin/env tsx

import { config } from 'dotenv';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { generateSearchableAttributes } from '../src/lib/generate-searchable-attributes';
import { generateCustomRanking } from '../src/lib/generate-custom-ranking';
import { generateAttributesForFaceting } from '../src/lib/generate-attributes-for-faceting';
import { generateSortByReplicas } from '../src/lib/generate-sort-by-replicas';

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

        console.log('\n✅ Analysis complete!');
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
