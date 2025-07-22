import { generateSearchableAttributes } from '../../lib/generate-searchable-attributes';
import { generateCustomRanking } from '../../lib/generate-custom-ranking';
import { generateAttributesForFaceting } from '../../lib/generate-attributes-for-faceting';
import { generateSortByReplicas } from '../../lib/generate-sort-by-replicas';
import { createModel, DEFAULT_MODEL } from '../../lib/model';

export interface ConfigurationOptions {
  searchable?: boolean;
  ranking?: boolean;
  faceting?: boolean;
  sortable?: boolean;
}

export function determineConfigurationsToGenerate(
  options: ConfigurationOptions
) {
  const generateAll =
    !options.searchable &&
    !options.ranking &&
    !options.faceting &&
    !options.sortable;

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
  options: ConfigurationOptions,
  modelName: string = DEFAULT_MODEL
) {
  const {
    shouldGenerateSearchable,
    shouldGenerateRanking,
    shouldGenerateFaceting,
    shouldGenerateSortable,
  } = determineConfigurationsToGenerate(options);

  const model = createModel(modelName);

  const [
    searchableAttributes,
    customRanking,
    attributesForFaceting,
    sortableAttributes,
  ] = await Promise.all([
    shouldGenerateSearchable
      ? generateSearchableAttributes(records, limit, model)
      : Promise.resolve(null),
    shouldGenerateRanking
      ? generateCustomRanking(records, limit, model)
      : Promise.resolve(null),
    shouldGenerateFaceting
      ? generateAttributesForFaceting(records, limit, model)
      : Promise.resolve(null),
    shouldGenerateSortable
      ? generateSortByReplicas(records, limit, model)
      : Promise.resolve(null),
  ]);

  return {
    searchableAttributes,
    customRanking,
    attributesForFaceting,
    sortableAttributes,
  };
}
