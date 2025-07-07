import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import z from 'zod';

const schema = z.object({
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

export async function generateSortByReplicas(
  records: Array<Record<string, unknown>>,
  limit: number = 10
) {
  const sampleRecords = records.slice(0, limit);

  const prompt = `
    Analyze these sample records and determine which attributes should be used for sorting in an Algolia search index.

    Sample records:
    ${JSON.stringify(sampleRecords, null, 2)}

    Sorting allows users to order results by specific attributes (like price low-to-high), overriding relevance-based ranking.

    Rules for selecting sorting attributes:
    
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
    
    Focus on attributes that:
    1. Have numeric values
    2. Users would naturally want to sort by (price, date, rating)
    3. Have meaningful ordering (not random values)
    4. Exist consistently across records
    
    Limit to 3-5 attributes maximum for optimal user experience.
  `;

  try {
    const { object } = await generateObject({
      model: anthropic('claude-3-haiku-20240307'),
      maxTokens: 1000,
      temperature: 0.1,
      schema,
      prompt,
    });

    return object;
  } catch (err) {
    console.error('AI sorting analysis error:', err);

    // Fallback: look for common sorting attributes
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
      .slice(0, 3);

    return {
      sortableAttributes: fallbackSorting,
      reasoning:
        'Fallback: Selected numeric attributes with sorting-related names',
    };
  }
}
