#!/usr/bin/env tsx

import { config } from 'dotenv';
import { Command } from 'commander';
import { createAnalyzeCommand } from './src/cli/commands/analyze';
import { createCompareCommand } from './src/cli/commands/compare';

config();

const program = new Command();

program
  .name('generative-relevance')
  .description('CLI tool for testing AI-powered Algolia configuration generation')
  .version('1.0.0');

// Add commands
program.addCommand(createAnalyzeCommand());
program.addCommand(createCompareCommand());

program.parse();