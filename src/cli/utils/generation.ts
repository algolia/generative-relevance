import { generateSearchableAttributes } from '../../lib/generate-searchable-attributes';
import { generateCustomRanking } from '../../lib/generate-custom-ranking';
import { generateAttributesForFaceting } from '../../lib/generate-attributes-for-faceting';
import { generateSortByReplicas } from '../../lib/generate-sort-by-replicas';
import { ConfigResult } from './display';

export interface ConfigurationOptions {
  searchable?: boolean;
  ranking?: boolean;
  faceting?: boolean;
  sortable?: boolean;
}

export function determineConfigurationsToGenerate(options: ConfigurationOptions) {
  const generateAll = !options.searchable && !options.ranking && !options.faceting && !options.sortable;
  
  return {
    shouldGenerateSearchable: generateAll || options.searchable,
    shouldGenerateRanking: generateAll || options.ranking,
    shouldGenerateFaceting: generateAll || options.faceting,
    shouldGenerateSortable: generateAll || options.sortable,
  };
}

export async function generateConfigurations(
  records: any[],
  limit: number,
  options: ConfigurationOptions
) {
  const {
    shouldGenerateSearchable,
    shouldGenerateRanking,
    shouldGenerateFaceting,
    shouldGenerateSortable,
  } = determineConfigurationsToGenerate(options);

  const [
    searchableAttributes,
    customRanking,
    attributesForFaceting,
    sortableAttributes,
  ] = await Promise.all([
    shouldGenerateSearchable ? generateSearchableAttributes(records, limit) : Promise.resolve(null),
    shouldGenerateRanking ? generateCustomRanking(records, limit) : Promise.resolve(null),
    shouldGenerateFaceting ? generateAttributesForFaceting(records, limit) : Promise.resolve(null),
    shouldGenerateSortable ? generateSortByReplicas(records, limit) : Promise.resolve(null),
  ]);

  return {
    searchableAttributes,
    customRanking,
    attributesForFaceting,
    sortableAttributes,
  };
}