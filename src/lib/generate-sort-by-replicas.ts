import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import z from 'zod';

const schema = z.object({
  sortableAttributes: z
    .array(z.string())
    .describe(
      'Array of sortable attributes with direction modifiers (e.g., "desc(price)", "asc(price)", "desc(rating)")'
    ),
  reasoning: z
    .string()
    .describe(
      'Brief explanation of the sorting attributes and directions chosen'
    ),
});

export async function generateSortByReplicas(
  records: Array<Record<string, unknown>>,
  limit: number = 10
) {
  const sampleRecords = records.slice(0, limit);

  const prompt = `
    Analyze these sample records and determine which attributes should be used for sorting in an Algolia search index, along with their appropriate sorting directions.

    Sample records:
    ${JSON.stringify(sampleRecords, null, 2)}

    Use the following chain of thought approach to solve this step by step:

    Step 1: Identify potential sortable attributes
    - Look for numeric attributes that users commonly sort by
    - Consider: prices, dates, ratings, popularity metrics, quantities, counts
    - Exclude: text/string attributes, unique identifiers, URLs, booleans, internal metadata
    
    Step 2: Filter and prioritize attributes
    - Remove duplicates and similar attributes (e.g., if both "price" and "cost" exist, choose "price")
    - Choose the most user-friendly attribute from each category
    - Ensure attributes exist consistently across records
    - Limit to 3-4 base attributes maximum
    
    Step 3: Determine sorting directions for each attribute
    - For PRICES/COSTS: Include both desc(price) and asc(price) as both are commonly useful
    - For DATES: Usually desc(date) for "newest first" (most common), asc(date) only if "oldest first" is also useful
    - For RATINGS: Usually desc(rating) for "highest rated first" (most common), asc(rating) rarely useful
    - For POPULARITY METRICS: Usually desc(views) for "most popular first" (most common)
    - For QUANTITIES: Usually desc(stock) for "most in stock first" or asc(stock) for "low stock first"
    
    Step 4: Format final result
    - Return each attribute with its modifier: "desc(attributeName)" or "asc(attributeName)"
    - Include both directions for the same attribute if both are commonly useful (especially for price)
    - Limit to 3-6 sorting options maximum (accounting for both directions of some attributes)

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
    
    Each attribute should be returned with its modifier: "desc(attributeName)" or "asc(attributeName)".
    You can include both directions for the same attribute if both are commonly useful (especially for price).
    
    Limit to 3-6 sorting options maximum for optimal user experience (accounting for both directions of some attributes).
    If no attributes are suitable for sorting, return an empty array.
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
