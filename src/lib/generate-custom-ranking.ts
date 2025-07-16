import { generateObject } from 'ai';
import z from 'zod';

import { validateAttributes } from './validate-attributes';
import { model } from './model';

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
    
    Step 1: Identify potential custom ranking attributes from the sample records
    Step 2: Order custom ranking attributes by importance
    Step 3: Determine appropriate sort order
    Step 4: Format final result with sort order
    
    CRITICAL RULES:
    - Only suggest attributes that actually exist in the provided sample records, don't invent ones
    - Only suggest attributes truly suitable for custom ranking. If no attributes clearly indicate quality or relevance, return an empty array.

    Rules for selecting custom ranking attributes:
        
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
    
    Rules for ordering custom ranking attributes by importance:
    When sorting records, Algolia uses a tie-breaking algorithm using custom ranking criterion in the order you gave. If the first one breaks the tie, the next one is never considered.
    When ordering custom ranking attributes, consider:
    - Business importance (attributes that are a stronger signal of interest for users go first)
    - Cardinality of values (attributes which values are too varied shouldn't go first because they would often break the tie on insignificant gaps)
    
    Rules for determining the sort order:
    - Use "desc(attribute)" for attributes where higher values are better (sales, ratings, popularity)
    - Use "asc(attribute)" for attributes where lower values are better (rank position, priority level)
        
    Explain your answer step-by-step.
  `;

  try {
    const { object } = await generateObject({
      model,
      maxTokens: 1000,
      temperature: 0.1,
      schema,
      prompt,
    });

    // Validate that all suggested attributes actually exist in the records
    const customRanking = validateAttributes(
      object.customRanking,
      sampleRecords,
      'Custom ranking'
    );

    const filteredCount = object.customRanking.length - customRanking.length;
    let reasoning = object.reasoning;

    if (filteredCount > 0) {
      reasoning += ` Filtered out ${filteredCount} non-existent attribute(s) from AI suggestions.`;
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
