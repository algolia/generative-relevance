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
    Analyze these sample records and determine which attributes should be configured for faceting in an Algolia search index, along with their appropriate modifiers.

    Sample records:
    ${JSON.stringify(filteredRecords, null, 2)}

    Use the following chain of thought approach to solve this step by step:

    Step 1: Identify potential faceting attributes
    - Look for categorical attributes that users would filter by
    - Consider: categories, brands, statuses, locations, formats, materials
    - Exclude: unique identifiers, URLs, long text, numeric values for ranking
    
    Step 2: Filter and prioritize attributes
    - Remove attributes with too many unique values (unless suitable for searchable)
    - Choose attributes that provide meaningful filtering options
    - Ensure attributes exist consistently across records
    - Limit to 5-8 attributes maximum
    
    Step 3: Determine faceting modifiers for each attribute
    - Use "attribute" for regular facets (limited unique values, <10)
    - Use "searchable(attribute)" for facets with many values (brands, locations with 10s+ options)
    - Use "filterOnly(attribute)" for facets used only programmatically, not displayed to users
    
    Step 4: Format final result
    - Return each attribute with its modifier: "attribute", "searchable(attribute)", or "filterOnly(attribute)"
    - Prioritize user-facing filters over programmatic ones
    - Quality over quantity - better to have fewer, more useful facets

    Facets are filterable categories that allow users to refine search results. Think of them as filters users can apply.

    Rules for selecting faceting attributes:
    
    IMPORTANT: Only suggest attributes that are truly suitable for faceting. It's better to return an empty array than to force inappropriate attributes.
    
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
    
    Each attribute should be returned with its modifier: "attribute", "searchable(attribute)", or "filterOnly(attribute)".
    
    Limit to 5-8 faceting attributes maximum for optimal user experience.
    If no attributes are suitable for faceting, return an empty array. Quality over quantity.
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
    // Only suggest attributes that clearly indicate faceting potential
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

        // Only include attributes with clear faceting indicators
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

        // Exclude obvious non-faceting attributes
        const isExcluded =
          lowerKey.includes('id') ||
          lowerKey.includes('url') ||
          lowerKey.includes('description') ||
          lowerKey.includes('title') ||
          lowerKey.includes('name') ||
          lowerKey.includes('text') ||
          key.startsWith('_');

        // Only return attributes that clearly indicate faceting potential
        return (
          (isString || isBoolean) &&
          isFacetAttribute &&
          !isExcluded &&
          value !== null
        );
      })
      .slice(0, 3) // Reduced from 5 to 3 to be more conservative
      .map((key) => {
        const lowerKey = key.toLowerCase();
        // Apply faceting modifiers based on attribute type
        if (
          lowerKey.includes('brand') ||
          lowerKey.includes('author') ||
          lowerKey.includes('designer')
        ) {
          return `searchable(${key})`; // Brands/authors often have many options
        } else if (
          lowerKey.includes('category') ||
          lowerKey.includes('genre') ||
          lowerKey.includes('type')
        ) {
          return key; // Categories are usually limited options
        } else if (lowerKey.includes('status')) {
          return `filterOnly(${key})`; // Status often used programmatically
        } else {
          return key; // Default to regular facet
        }
      });

    // Merge with hierarchical facets
    const allFallbackFacets = [...hierarchicalFacets, ...fallbackFacets];

    const reasoningParts = [];

    if (fallbackFacets.length > 0) {
      reasoningParts.push(
        'Fallback: Selected attributes with clear faceting indicators'
      );
    } else {
      reasoningParts.push('Fallback: No suitable faceting attributes detected');
    }

    if (hierarchicalFacets.length > 0) {
      reasoningParts.push(
        `Additionally detected hierarchical facets: ${hierarchicalFacets.join(
          ', '
        )}`
      );
    }

    return {
      attributesForFaceting: allFallbackFacets,
      reasoning:
        reasoningParts.join('. ') +
        (allFallbackFacets.length > 0
          ? ' Applied appropriate faceting modifiers based on attribute types.'
          : ''),
    };
  }
}
