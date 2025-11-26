import React from 'react';

import { Command } from 'commander';
import { render } from 'ink';
import fs from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import { Evaluate } from '../../components/Evaluate';
import { ConfigurationOptions } from '../utils/generation';
import { validateEnvVars } from '../utils/validation';

export interface EvaluateOptions extends ConfigurationOptions {
  limit: string;
  verbose?: boolean;
  model: string;
}

export function createEvaluateCommand(): Command {
  return new Command('evaluate')
    .description(
      'Evalute Algolia applications for opportunities to run analysis'
    )
    .argument('[entriesPath]', 'Path to entries.json', 'entries.json')
    .option('-l, --limit <number>', 'Number of records to analyze', '10')
    .option('-v, --verbose', 'Show detailed reasoning for each configuration')
    .option('--searchable', 'Compare searchable attributes only')
    .option('--ranking', 'Compare custom ranking only')
    .option('--faceting', 'Compare attributes for faceting only')
    .option('--sortable', 'Compare sortable attributes only')
    .option(
      '-m, --model <model>',
      'AI model to use (claude-3-5-haiku-latest, claude-3-5-sonnet-latest, gpt-4.1-nano)',
      'gpt-5'
    )
    .action(async (entriesPath: string, options: EvaluateOptions) => {
      validateEnvVars(options.model);

      const currentDirectory = cwd();
      const fullEntriesPath = path.resolve(currentDirectory, entriesPath);
      const outputPath = path.resolve(path.dirname(entriesPath), 'evaluations');

      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
      }

      render(
        <Evaluate entriesPath={fullEntriesPath} outputPath={outputPath} />,
        { incrementalRendering: true }
      );
    });
}
