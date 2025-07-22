import { generateObject } from 'ai';
import z from 'zod';

import { validateAttributes } from './validate-attributes';
import { getModelName, model } from './model';
import { addCliUsage } from './costs-tracker';

const schema = z.object({
  searchableAttributes: z
    .array(z.string())
    .describe('Array of attribute names that should be searchable'),
  reasoning: z
    .string()
    .describe('Brief explanation of why these attributes were selected'),
});

export async function generateSearchableAttributes(
  records: Array<Record<string, unknown>>,
  limit: number = 10,
  customModel?: any
) {
  const sampleRecords = records.slice(0, limit);

  const prompt = `
    Analyze these sample records and determine which attributes should be searchable in an Algolia search index.

    Sample records:
    ${JSON.stringify(sampleRecords, null, 2)}
    
    Step 1: Identify potential searchable attributes from the sample records
    Step 2: Order attributes by search importance and user intent
    Step 3: Determine modifier configuration (ordered vs unordered)
    Step 4: Format final result with appropriate modifiers
    
    CRITICAL RULES:
    - Only suggest attributes that actually exist in the provided sample records, don't invent ones
    - Only suggest attributes truly suitable for search. If no attributes are clearly searchable, return an empty array.

    Rules for selecting searchable attributes:
        
    INCLUDE text attributes that users search for:
    - Names, titles, descriptions, summaries
    - Brands, manufacturers, creators, authors
    - Categories, types, genres
    - Features, ingredients, cast, tags
    - Locations, addresses
    - Any text users might query
    
    EXCLUDE attributes that are:
    - URLs, IDs, dates, timestamps, booleans
    - Numeric values for ranking/sorting
    - Display-only or internal metadata
    
    Rules for ordering attributes by search importance:
    Order matters - first attributes have higher search relevance.
    1. Primary identifiers (name, title) rank highest
    2. Secondary identifiers (brand, creator) come next
    3. Content attributes (description, features) follow
    4. Consider user search patterns for this data type
    
    Rules for equal ranking attributes:
    To make matches in multiple attributes rank equally, combine them in comma-separated strings:
    - "title,alternate_title" - treats both title fields equally
    - "name,display_name" - treats both name fields equally
    - "brand,manufacturer" - treats both brand fields equally
    
    Rules for modifier configuration:
    - Use "unordered(attribute)" for most cases (position doesn't matter)
    - Use "ordered(attribute)" only when early words are more important
    - For array attributes: ordered may make sense when early entries are more important (cast of actors) but not for equal importance (tags)
    - Default to unordered unless position specifically matters
    - Note: ordered modifier cannot be used with comma-separated attributes
    
    Explain your answer step-by-step.
  `;

  try {
    const { object, usage } = await generateObject({
      model: customModel || model,
      maxTokens: 1000,
      temperature: 0.1,
      schema,
      prompt,
    });

    if (usage) {
      const modelName = getModelName(customModel);

      addCliUsage(modelName, {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      });
    }

    // Validate that all suggested attributes actually exist in the records
    const searchableAttributes = validateAttributes(
      object.searchableAttributes,
      sampleRecords,
      'Searchable attributes'
    );

    const filteredCount =
      object.searchableAttributes.length - searchableAttributes.length;
    let reasoning = object.reasoning;

    if (filteredCount > 0) {
      reasoning += ` Filtered out ${filteredCount} non-existent attribute(s) from AI suggestions.`;
    }

    return {
      searchableAttributes,
      reasoning,
    };
  } catch (err) {
    console.error('AI analysis error:', err);

    const fallbackAttributes = Object.keys(sampleRecords[0] || {}).filter(
      (key) =>
        !key.startsWith('_') &&
        key !== 'objectID' &&
        !key.toLowerCase().includes('url') &&
        !key.toLowerCase().includes('id') &&
        typeof sampleRecords[0][key] === 'string'
    );

    return {
      searchableAttributes: fallbackAttributes,
      reasoning: 'Fallback: Selected string attributes excluding URLs and IDs',
    };
  }
}
