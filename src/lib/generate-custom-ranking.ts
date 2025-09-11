import { generateObject } from 'ai';
import z from 'zod';

import { validateAttributes } from './validate-attributes';
import { getModelName, model } from './model';
import { addCliUsage } from './costs-tracker';

const schema = z.object({
  customRanking: z
    .array(z.string())
    .describe(
      'Array of custom ranking criteria in order of importance (e.g., "desc(sales)", "asc(price)")'
    ),
  attributeReasons: z
    .array(
      z.object({
        attribute: z.string().describe('The custom ranking attribute'),
        reason: z
          .string()
          .describe(
            'Brief explanation of why this attribute is useful for custom ranking'
          ),
      })
    )
    .describe(
      'Array of objects explaining each suggested custom ranking attribute'
    ),
  reasoning: z
    .string()
    .describe(
      'Overall explanation of the custom ranking strategy and approach'
    ),
});

export async function generateCustomRanking(
  records: Array<Record<string, unknown>>,
  limit: number = 10,
  customModel?: any
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
    Algolia uses tie-breaking: if the first attribute breaks ties, later ones are ignored.
    
    ORDER BY SIGNAL QUALITY:
    1. Processed metrics BEFORE raw counts (derived scores before raw tallies)
    2. Business-critical metrics first (revenue, quality, engagement)
    3. Avoid high-cardinality attributes early (raw counts create ranking noise)
    4. Prefer normalized scores over raw measurements
    
    Rules for determining the sort order:
    - Use "desc(attribute)" for attributes where higher values are better (sales, ratings, popularity)
    - Use "asc(attribute)" for attributes where lower values are better (rank position, priority level)
        
    Explain your answer step-by-step.
  `;

  try {
    const { object, usage } = await generateObject({
      model: customModel || model,
      temperature: 0.1,
      schema,
      prompt,
    });

    if (usage) {
      const modelName = getModelName(customModel);

      addCliUsage(modelName, {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: usage.totalTokens || 0,
      });
    }

    // Validate that all suggested attributes actually exist in the records
    const customRanking = validateAttributes(
      object.customRanking,
      sampleRecords,
      'Custom ranking'
    );

    const filteredCount = object.customRanking.length - customRanking.length;
    let reasoning = object.reasoning;

    // Filter attributeReasons to only include validated attributes
    // Extract base attribute names from ranking strings (e.g., "desc(rating)" -> "rating")
    const baseAttributeNames = customRanking.map((attr) => {
      const match = attr.match(/(?:desc|asc)\((.+)\)|(.+)/);
      return match ? match[1] || match[2] : attr;
    });

    const validatedAttributeReasons = object.attributeReasons.filter((item) => {
      // Extract base attribute name from attributeReason (e.g., "desc(rating)" -> "rating")
      const baseReasonAttr = item.attribute.match(/(?:desc|asc)\((.+)\)|(.+)/);
      const baseReasonAttrName = baseReasonAttr
        ? baseReasonAttr[1] || baseReasonAttr[2]
        : item.attribute;
      return (
        baseAttributeNames.includes(baseReasonAttrName) ||
        customRanking.includes(item.attribute)
      );
    });

    if (filteredCount > 0) {
      reasoning += ` Filtered out ${filteredCount} non-existent attribute(s) from AI suggestions.`;
    }

    return {
      customRanking,
      attributeReasons: validatedAttributeReasons,
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

    // Create fallback attributeReasons
    const fallbackAttributeReasons = fallbackRanking.map((attr) => ({
      attribute: attr,
      reason: 'Selected based on common ranking patterns in attribute name',
    }));

    return {
      customRanking: fallbackRanking,
      attributeReasons: fallbackAttributeReasons,
      reasoning:
        'Fallback: Selected numeric attributes with ranking-related names',
    };
  }
}
