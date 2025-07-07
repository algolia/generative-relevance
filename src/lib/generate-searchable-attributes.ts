import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import z from 'zod';

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
  limit: number = 10
) {
  const sampleRecords = records.slice(0, limit);

  const prompt = `
    Analyze these sample records and determine which attributes should be searchable in an Algolia search index.

    Sample records:
    ${JSON.stringify(sampleRecords, null, 2)}

    Rules for selecting searchable attributes:
    
    INCLUDE attributes that are:
    - Descriptive text attributes (name, title, description, summary, bio, content)
    - Brand, manufacturer, or company names
    - Category or type information
    - Lists of features, actors, ingredients, or other descriptive elements
    - Keywords and tags
    - Filter attributes that users might search for (color, size, material, genre)
    - Author, creator, or contributor names
    - Location or place names
    
    EXCLUDE attributes that are:
    - URLs (image URLs, product URLs, links)
    - IDs (except objectID which is already handled)
    - Numeric values meant for ranking/sorting (price, rating, popularity_score)
    - Dates and timestamps
    - Boolean flags
    - Display-only attributes (thumbnails, status codes)
    - Internal metadata
    
    Focus on attributes that users would naturally search for when looking for these items.
    Consider the context and type of data to make intelligent decisions.
    
    Return the attributes in order of search importance (most important first).
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
