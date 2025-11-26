import { readFileSync } from 'fs';
import { validateEnvVars, validateJsonFile } from '../cli/utils/validation';
import {
  generateConfigurations,
  ConfigurationOptions,
} from '../cli/utils/generation';
import { fetchAlgoliaData } from '../cli/utils/algolia';

export interface AnalyzeInput {
  source: string;
  records?: any[];
  apiKey?: string;
  indexName?: string;
  limit: number;
  model: string;
  compareModel?: string;
  options: ConfigurationOptions;
}

export interface AnalyzeResult {
  searchableAttributes?: any;
  customRanking?: any;
  attributesForFaceting?: any;
  sortableAttributes?: any;
  duration: number;
  recordsAnalyzed: number;
}

export interface DualModelAnalyzeResult {
  model1: string;
  model2: string;
  results1: {
    searchableAttributes?: any;
    customRanking?: any;
    attributesForFaceting?: any;
    sortableAttributes?: any;
  };
  results2: {
    searchableAttributes?: any;
    customRanking?: any;
    attributesForFaceting?: any;
    sortableAttributes?: any;
  };
  duration: number;
  recordsAnalyzed: number;
}

export async function analyze(
  input: AnalyzeInput,
  logFn = (...lines: string[]) => console.log(...lines)
): Promise<AnalyzeResult | DualModelAnalyzeResult> {
  logFn(`\nRunning analysis on ${input.indexName}…`);

  const startTime = Date.now();

  let model1 = input.model;
  let model2 = input.compareModel;

  validateEnvVars(model1);

  if (model2) {
    validateEnvVars(model2);
  }

  const isAlgoliaMode = Boolean(input.apiKey && input.indexName);

  let records: any[];

  if (input.records) {
    records = input.records;
  } else if (isAlgoliaMode) {
    if (!input.apiKey || !input.indexName) {
      throw new Error(
        'Both apiKey and indexName are required when using Algolia mode'
      );
    }

    const { records: algoliaRecords } = await fetchAlgoliaData(
      input.source,
      input.apiKey,
      input.indexName,
      input.limit,
      logFn
    );

    if (algoliaRecords.length === 0) {
      throw new Error('No records found in the index');
    }

    records = algoliaRecords;
  } else {
    const fileContent = readFileSync(input.source, 'utf-8');
    records = validateJsonFile(fileContent);
  }

  const recordsToAnalyze = Math.min(records.length, input.limit);

  if (model2) {
    const [results1, results2] = await Promise.all([
      generateConfigurations(records, input.limit, input.options, model1),
      generateConfigurations(records, input.limit, input.options, model2),
    ]);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    return {
      model1,
      model2,
      results1,
      results2,
      duration,
      recordsAnalyzed: recordsToAnalyze,
    };
  } else {
    const {
      searchableAttributes,
      customRanking,
      attributesForFaceting,
      sortableAttributes,
    } = await generateConfigurations(
      records,
      input.limit,
      input.options,
      model1
    );

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    return {
      searchableAttributes,
      customRanking,
      attributesForFaceting,
      sortableAttributes,
      duration,
      recordsAnalyzed: recordsToAnalyze,
    };
  }
}
