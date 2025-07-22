import { generateObject, LanguageModelV1 } from 'ai';
import z from 'zod';

import { detectHierarchicalFacets } from './detect-hierarchical-facets';
import { validateAttributes } from './validate-attributes';
import { getModelName, model } from './model';
import { addCliUsage } from './costs-tracker';

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
  limit: number = 10,
  customModel?: LanguageModelV1
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
    
    Step 1: Identify potential faceting attributes from the sample records
    Step 2: Filter and prioritize suitable attributes for filtering
    Step 3: Determine appropriate modifiers based on attribute type
    Step 4: Format final result with modifiers

    CRITICAL RULES:
    - Only suggest attributes that actually exist in the provided sample records, don't invent ones
    - Only suggest attributes truly suitable for faceting
    - Better to return fewer, high-quality facets than padding with poor choices

    INCLUDE attributes good for filtering:
    - Categories, genres, departments, types
    - Brands, manufacturers, authors, designers
    - Colors, sizes, materials, styles
    - Status fields (available, featured, new)
    - Locations (city, country, region)
    - Boolean flags users might filter by

    EXCLUDE attributes not good for faceting:
    - Unique identifiers (IDs, SKUs, slugs)
    - URLs, links, long text descriptions
    - Numeric ranking values (price, rating, sales)
    - Dates, timestamps (unless it's categorical, like a year)

    MODIFIER RULES:
    - no modifier for facets that typically don't have many values and where users can see all options at once, or when users wouldn't typically type to find them (numbers, codes)
      Examples: "color", "size", "available", "featured"
    - "searchable(attribute)" for facets that typically have many values needing search functionality (users type to find options)
      Examples: "searchable(brand)", "searchable(author)", "searchable(category)", "searchable(city)", "searchable(tags)", "searchable(genre)"
    - "filterOnly(attribute)" for facets used only programmatically, not displayed in UI
      Examples: "filterOnly(internal_status)", "filterOnly(sync_status)"

    Aim for 5-8 high-quality faceting attributes. You can suggest up to 10-12 knowing some may be filtered out during validation.
    
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
    const validatedAttributes = validateAttributes(
      object.attributesForFaceting,
      sampleRecords,
      'Facets'
    );

    const attributesForFaceting = [
      ...hierarchicalFacets,
      ...validatedAttributes,
    ];

    const filteredCount =
      object.attributesForFaceting.length - validatedAttributes.length;
    let reasoning = object.reasoning;

    if (hierarchicalFacets.length > 0) {
      reasoning += ` Additionally, detected hierarchical facets: ${hierarchicalFacets.join(
        ', '
      )}.`;
    }

    if (filteredCount > 0) {
      reasoning += ` Filtered out ${filteredCount} non-existent attribute(s) from AI suggestions.`;
    }

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
