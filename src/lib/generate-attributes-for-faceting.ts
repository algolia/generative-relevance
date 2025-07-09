import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import z from 'zod';
import { detectHierarchicalFacets } from './detect-hierarchical-facets';

const schema = z.object({
  attributesForFaceting: z
    .array(z.string())
    .describe(
      'Array of faceting attributes (e.g., "category", "searchable(brand)", "filterOnly(status)")'
    ),
  reasoning: z
    .string()
    .describe(
      'Brief explanation of why these faceting attributes were selected'
    ),
});

export async function generateAttributesForFaceting(
  records: Array<Record<string, unknown>>,
  limit: number = 10
) {
  const sampleRecords = records.slice(0, limit);

  // Detect hierarchical facets with code (more reliable)
  const hierarchicalFacets = detectHierarchicalFacets(sampleRecords);

  // Create a filtered version of sample records for AI analysis without
  // hierarchical facet attributes
  const filteredRecords = sampleRecords.map((record) => {
    const filtered: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (!hierarchicalFacets.includes(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  });

  const prompt = `
    Analyze these sample records and determine which attributes should be configured for faceting in an Algolia search index.

    Sample records:
    ${JSON.stringify(filteredRecords, null, 2)}

    Facets are filterable categories that allow users to refine search results. Think of them as filters users can apply.

    Rules for selecting faceting attributes:
    
    INCLUDE attributes that are good for filtering:
    - Category/type fields (genre, category, department, section)
    - Brand, manufacturer, designer, author, artist names
    - Color, size, material, style attributes
    - Status fields (available, featured, new, bestseller)
    - Location/geographic attributes (city, country, region)
    - Format/type attributes (format, edition, version)
    - Boolean flags that users might filter by
    - Enumerated values with limited options
        
    EXCLUDE attributes that are not good for faceting:
    - Unique identifiers (IDs, SKUs, slugs)
    - URLs and links
    - Long text descriptions
    - Numeric values used for ranking (price, rating, sales)
    - Dates and timestamps (unless they represent categories like year)
    - Attributes with too many unique values (unless searchable)
    
    For each faceting attribute, determine the configuration:
    - Use "attribute" for regular facets (limited unique values, <10)
    - Use "searchable(attribute)" for facets with many values (brands with 10s of options)
    - Use "filterOnly(attribute)" for facets used only programmatically, not displayed
    
    Prioritize attributes that users would commonly want to filter by.
  `;

  try {
    const { object } = await generateObject({
      model: anthropic('claude-3-haiku-20240307'),
      maxTokens: 1000,
      temperature: 0.1,
      schema,
      prompt,
    });

    const attributesForFaceting = [
      ...hierarchicalFacets,
      ...object.attributesForFaceting,
    ];

    const reasoning =
      hierarchicalFacets.length > 0
        ? `${
            object.reasoning
          } Additionally, detected hierarchical facets: ${hierarchicalFacets.join(
            ', '
          )}.`
        : object.reasoning;

    return {
      attributesForFaceting,
      reasoning,
    };
  } catch (err) {
    console.error('AI faceting analysis error:', err);

    // Fallback: look for common faceting attributes (excluding hierarchical facet objects)
    const firstRecord = sampleRecords[0] || {};

    const fallbackFacets = Object.keys(firstRecord)
      .filter((key) => {
        const value = firstRecord[key];
        const isString = typeof value === 'string';
        const isBoolean = typeof value === 'boolean';
        const isHierarchicalFacet = hierarchicalFacets.includes(key);
        const lowerKey = key.toLowerCase();

        // Skip hierarchical facet objects as they're handled separately
        if (isHierarchicalFacet) {
          return false;
        }

        const isFacetAttribute =
          lowerKey.includes('category') ||
          lowerKey.includes('brand') ||
          lowerKey.includes('type') ||
          lowerKey.includes('genre') ||
          lowerKey.includes('color') ||
          lowerKey.includes('size') ||
          lowerKey.includes('status') ||
          lowerKey.includes('author') ||
          lowerKey.includes('designer');

        const isNotExcluded =
          !lowerKey.includes('id') &&
          !lowerKey.includes('url') &&
          !lowerKey.includes('description') &&
          !key.startsWith('_');

        return (
          (isString || isBoolean) &&
          (isFacetAttribute || isNotExcluded) &&
          value !== null
        );
      })
      .slice(0, 5);

    // Merge with hierarchical facets
    const allFallbackFacets = [...hierarchicalFacets, ...fallbackFacets];

    const reasoningParts = [
      'Fallback: Selected string/boolean attributes with faceting-related names',
    ];
    if (hierarchicalFacets.length > 0) {
      reasoningParts.push(
        `Additionally detected hierarchical facets: ${hierarchicalFacets.join(
          ', '
        )}`
      );
    }

    return {
      attributesForFaceting: allFallbackFacets,
      reasoning: reasoningParts.join('. '),
    };
  }
}
