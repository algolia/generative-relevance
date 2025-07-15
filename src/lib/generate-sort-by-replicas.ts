import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import z from 'zod';

const attributeSchema = z.object({
  sortableAttributes: z
    .array(z.string())
    .describe(
      'Array of attribute names suitable for sorting (e.g., "price", "date", "rating")'
    ),
  reasoning: z
    .string()
    .describe(
      'Brief explanation of why these attributes were selected for sorting'
    ),
});

const directionSchema = z.object({
  sortableAttributes: z
    .array(z.string())
    .describe(
      'Array of sortable attributes with direction modifiers (e.g., "desc(price)", "asc(price)", "desc(rating)")'
    ),
  reasoning: z
    .string()
    .describe(
      'Brief explanation of the sorting directions chosen for each attribute'
    ),
});

export async function generateSortByReplicas(
  records: Array<Record<string, unknown>>,
  limit: number = 10
) {
  const sampleRecords = records.slice(0, limit);

  // Step 1: Select sortable attributes
  const attributePrompt = `
    Analyze these sample records and determine which attributes should be used for sorting in an Algolia search index.

    Sample records:
    ${JSON.stringify(sampleRecords, null, 2)}

    Rules for selecting sorting attributes:
    
    IMPORTANT: Only suggest attributes that are truly suitable for sorting. If no attributes are clearly sortable, return an empty array.
    
    INCLUDE numeric attributes that users commonly sort by:
    - Prices, costs, amounts (price, cost, total, fee)
    - Dates and timestamps (created_at, published_date, release_date, updated_at)
    - Ratings and scores (rating, score, stars, grade)
    - Popularity metrics (views, likes, sales, downloads, popularity)
    - Quantities and counts (stock, quantity, reviews_count, votes)
    - Sequential numbers and IDs that represent order
    
    EXCLUDE attributes that are not good for sorting:
    - Text/string attributes (names, descriptions, titles)
    - Unique identifiers (random IDs, UUIDs)
    - URLs and links
    - Boolean values
    - Internal metadata
    - Attributes used primarily for custom ranking
    
    AVOID DUPLICATES AND SIMILAR ATTRIBUTES:
    - If multiple price-related attributes exist (price, cost, amount, total), choose the most user-friendly one (typically "price")
    - If multiple date attributes exist (created_at, updated_at, published_date), choose the most relevant for end users (typically publication or creation date)
    - If multiple rating attributes exist (rating, score, stars), choose the most commonly understood one (typically "rating" or "stars")
    - If multiple count attributes exist (views, likes, downloads), choose the most meaningful for sorting (typically the primary engagement metric)
    
    Focus on attributes that:
    1. Have numeric values with meaningful ordering
    2. Users would naturally want to sort by (price, date, rating)
    3. Are user-friendly and commonly understood
    4. Exist consistently across records
    5. Are distinct from each other (no similar attributes)
    
    Prioritize end-user usability over technical completeness. Choose the single best attribute from each category rather than multiple similar ones.
    
    Limit to 3-4 attributes maximum for optimal user experience.
    If no attributes are suitable for sorting, return an empty array.
  `;

  try {
    // Step 1: Get sortable attributes
    const { object: attributeResult } = await generateObject({
      model: anthropic('claude-3-haiku-20240307'),
      maxTokens: 500,
      temperature: 0.1,
      schema: attributeSchema,
      prompt: attributePrompt,
    });

    if (
      !attributeResult.sortableAttributes ||
      attributeResult.sortableAttributes.length === 0
    ) {
      return {
        sortableAttributes: [],
        reasoning:
          attributeResult.reasoning ||
          'No suitable attributes found for sorting',
      };
    }

    // Step 2: Add sorting directions
    const directionPrompt = `
      For these selected sortable attributes: ${attributeResult.sortableAttributes.join(
        ', '
      )}
      
      Determine the most useful sorting direction(s) for each attribute. Return each attribute with its modifier.
      
      Guidelines for sorting directions:
      
      - For PRICES/COSTS: Include both desc(price) and asc(price) as both are commonly useful
      - For DATES: Usually desc(date) for "newest first" (most common), asc(date) only if "oldest first" is also useful
      - For RATINGS: Usually desc(rating) for "highest rated first" (most common), asc(rating) rarely useful
      - For POPULARITY METRICS: Usually desc(views) for "most popular first" (most common)
      - For QUANTITIES: Usually desc(stock) for "most in stock first" or asc(stock) for "low stock first"
      
      Common patterns:
      - Price: ["desc(price)", "asc(price)"] (both directions useful)
      - Date: ["desc(date)"] (newest first most common)
      - Rating: ["desc(rating)"] (highest first most common)
      - Views/Popularity: ["desc(views)"] (most popular first)
      - Stock: ["desc(stock)"] or ["asc(stock)"] depending on use case
      
      Each attribute should be returned with its modifier: "desc(attributeName)" or "asc(attributeName)".
      You should include both directions for the same attribute if both are commonly useful (especially for price).
      
      Limit to 3-6 sorting options maximum for optimal user experience (accounting for both directions of some attributes).
    `;

    const { object: directionResult } = await generateObject({
      model: anthropic('claude-3-haiku-20240307'),
      maxTokens: 500,
      temperature: 0.1,
      schema: directionSchema,
      prompt: directionPrompt,
    });

    return {
      sortableAttributes: directionResult.sortableAttributes,
      reasoning:
        `${attributeResult.reasoning} ${directionResult.reasoning}`.trim(),
    };
  } catch (err) {
    console.error('AI sorting analysis error:', err);

    // Fallback: look for common sorting attributes with directions
    const firstRecord = sampleRecords[0] || {};
    const fallbackSorting = Object.keys(firstRecord)
      .filter((key) => {
        const value = firstRecord[key];
        const isNumeric = typeof value === 'number';
        const lowerKey = key.toLowerCase();

        const isSortingAttribute =
          lowerKey.includes('price') ||
          lowerKey.includes('cost') ||
          lowerKey.includes('date') ||
          lowerKey.includes('rating') ||
          lowerKey.includes('score') ||
          lowerKey.includes('views') ||
          lowerKey.includes('likes') ||
          lowerKey.includes('sales') ||
          lowerKey.includes('count') ||
          lowerKey.includes('timestamp');

        return isNumeric && isSortingAttribute;
      })
      .slice(0, 3)
      .map((key) => {
        const lowerKey = key.toLowerCase();
        // Apply common sorting directions based on attribute type
        if (lowerKey.includes('price') || lowerKey.includes('cost')) {
          return `desc(${key})`; // Most expensive first is common default
        } else if (
          lowerKey.includes('date') ||
          lowerKey.includes('timestamp')
        ) {
          return `desc(${key})`; // Newest first is common default
        } else if (lowerKey.includes('rating') || lowerKey.includes('score')) {
          return `desc(${key})`; // Highest rated first
        } else if (
          lowerKey.includes('views') ||
          lowerKey.includes('likes') ||
          lowerKey.includes('sales')
        ) {
          return `desc(${key})`; // Most popular first
        } else {
          return `desc(${key})`; // Default to descending
        }
      });

    return {
      sortableAttributes: fallbackSorting,
      reasoning:
        'Fallback: Selected numeric attributes with sorting-related names and applied common sorting directions',
    };
  }
}
