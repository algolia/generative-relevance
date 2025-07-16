import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import z from 'zod';
import { validateAttributes } from './validate-attributes';

const schema = z.object({
  customRanking: z
    .array(z.string())
    .describe(
      'Array of custom ranking criteria in order of importance (e.g., "desc(sales)", "asc(price)")'
    ),
  reasoning: z
    .string()
    .describe('Brief explanation of why these ranking criteria were selected'),
});

export async function generateCustomRanking(
  records: Array<Record<string, unknown>>,
  limit: number = 10
) {
  const sampleRecords = records.slice(0, limit);

  const prompt = `
    Analyze these sample records and determine which attributes should be used for custom ranking in an Algolia search index.

    Sample records:
    ${JSON.stringify(sampleRecords, null, 2)}

    Rules for selecting custom ranking attributes:
    
    IMPORTANT: Only suggest attributes that are truly suitable for ranking. If no attributes clearly indicate quality or relevance, return an empty array.
    
    INCLUDE numeric/boolean attributes that indicate quality or relevance:
    - Sales counts, purchase counts, order counts
    - View counts, click counts, impression counts
    - Likes, favorites, votes, ratings (numeric)
    - Popularity scores, trending scores
    - Review counts, comment counts
    - Stock levels, availability counts
    - Release dates, creation dates (as timestamps)
    - Priority levels, importance scores
    - Boolean flags for featured, premium, bestseller status
    
    EXCLUDE attributes that are:
    - Text/string attributes (these go in searchableAttributes)
    - IDs and internal references
    - URLs and display attributes
    - Prices (usually used for sorting, not ranking)
    - Coordinates and technical data
    
    For each attribute, determine the sort order:
    - Use "desc(attribute)" for attributes where higher values are better (sales, ratings, popularity)
    - Use "asc(attribute)" for attributes where lower values are better (rank position, priority level)
    
    Return attributes in order of ranking importance (most important first).
    If no attributes are suitable for ranking, return an empty array.
  `;

  try {
    const { object } = await generateObject({
      model: anthropic('claude-3-haiku-20240307'),
      maxTokens: 1000,
      temperature: 0.1,
      schema,
      prompt,
    });

    // Validate that all suggested attributes actually exist in the records
    const customRanking = validateAttributes(
      object.customRanking,
      sampleRecords
    );

    const filteredCount = object.customRanking.length - customRanking.length;
    let reasoning = object.reasoning;

    if (filteredCount > 0) {
      reasoning += ` Custom ranking: Filtered out ${filteredCount} non-existent attribute(s) from AI suggestions.`;
    }

    return {
      customRanking,
      reasoning,
    };
  } catch (err) {
    console.error('AI custom ranking analysis error:', err);

    // Fallback: look for common ranking attributes
    const [firstRecord] = sampleRecords;

    const fallbackRanking = Object.keys(firstRecord)
      .filter((key) => {
        const value = firstRecord[key];
        const isNumeric = typeof value === 'number';
        const isBoolean = typeof value === 'boolean';
        const lowerKey = key.toLowerCase();

        const isRankingAttribute =
          lowerKey.includes('sales') ||
          lowerKey.includes('views') ||
          lowerKey.includes('likes') ||
          lowerKey.includes('rating') ||
          lowerKey.includes('popularity') ||
          lowerKey.includes('count') ||
          lowerKey.includes('score');

        return (isNumeric || isBoolean) && isRankingAttribute;
      })
      .slice(0, 3)
      .map((key) => `desc(${key})`);

    return {
      customRanking: fallbackRanking,
      reasoning:
        'Fallback: Selected numeric attributes with ranking-related names',
    };
  }
}
