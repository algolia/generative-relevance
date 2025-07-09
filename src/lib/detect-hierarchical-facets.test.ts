import { describe, it, expect } from 'vitest';
import { detectHierarchicalFacets } from './detect-hierarchical-facets';

describe('detectHierarchicalFacets', () => {
  it('should detect hierarchical facets with chevron separators', () => {
    const records = [
      {
        objectID: '1',
        name: 'Apple',
        categories: {
          lvl0: 'products',
          lvl1: 'products > fruits',
        },
      },
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['categories']);
  });

  it('should detect hierarchical facets with various naming conventions', () => {
    const records = [
      {
        objectID: '1',
        breadcrumbs: {
          level1: 'home',
          level2: 'home > shop',
          level3: 'home > shop > electronics',
        },
        taxonomy: {
          tier1: 'animals',
          tier2: 'animals > mammals',
          tier3: 'animals > mammals > dogs',
        },
        path: {
          segment_0: 'website',
          segment_1: 'website > blog',
          segment_2: 'website > blog > tech',
        },
      },
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['breadcrumbs', 'taxonomy', 'path']);
  });

  it('should detect multiple hierarchical facet attributes', () => {
    const records = [
      {
        objectID: '1',
        name: 'Product',
        categories: {
          lvl0: 'products',
          lvl1: 'products > fruits',
        },
        locations: {
          lvl0: 'USA',
          lvl1: 'USA > California',
        },
      },
    ];

    const result = detectHierarchicalFacets(records);
    expect(result).toEqual(['categories', 'locations']);
  });

  it('should detect hierarchical facets across multiple records', () => {
    const records = [
      {
        objectID: '1',
        categories: {
          lvl0: 'products',
          lvl1: 'products > fruits',
        },
      },
      {
        objectID: '2',
        departments: {
          lvl0: 'company',
          lvl1: 'company > engineering',
        },
      },
    ];

    const result = detectHierarchicalFacets(records);
    expect(result).toEqual(['categories', 'departments']);
  });

  it('should ignore non-hierarchical nested objects', () => {
    const records = [
      {
        objectID: '1',
        name: 'Product',
        metadata: {
          source: 'api',
          quality: 'high',
          tags: ['new', 'featured'],
        },
        config: {
          enabled: true,
          priority: 1,
        },
      },
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual([]);
  });

  it('should ignore objects without chevron separators', () => {
    const records = [
      {
        objectID: '1',
        name: 'Product',
        invalidHierarchy: {
          level0: 'not hierarchical',
          level1: 'also not hierarchical',
          step1: 'no chevrons here',
          category: 'electronics',
        },
      },
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual([]);
  });

  it('should handle mixed attributes and mixed values', () => {
    const records = [
      {
        objectID: '1',
        name: 'Product',
        categories: {
          name: 'categories',
          lvl0: 'products',
          lvl1: 'products > fruits',
          description: 'Product categories',
        },
        metadata: {
          source: 'api',
          quality: 'high',
        },
        brand: 'Apple',
      },
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['categories']);
  });

  it('should handle empty records array', () => {
    const records: Array<Record<string, unknown>> = [];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual([]);
  });

  it('should handle records with no nested objects', () => {
    const records = [
      {
        objectID: '1',
        name: 'Product',
        brand: 'Apple',
        price: 999,
      },
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual([]);
  });

  it('should handle null and undefined values', () => {
    const records = [
      {
        objectID: '1',
        name: 'Product',
        categories: null,
        locations: undefined,
        validHierarchy: {
          lvl0: 'root',
          lvl1: 'root > child',
        },
      },
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['validHierarchy']);
  });

  it('should handle arrays (not detect them as hierarchical)', () => {
    const records = [
      {
        objectID: '1',
        name: 'Product',
        tags: ['tag1', 'tag2'],
        categories: {
          lvl0: 'products',
          lvl1: 'products > fruits',
        },
      },
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['categories']);
  });

  it('should deduplicate attributes found in multiple records', () => {
    const records = [
      {
        objectID: '1',
        categories: {
          lvl0: 'products',
          lvl1: 'products > fruits',
        },
      },
      {
        objectID: '2',
        categories: {
          lvl0: 'products',
          lvl1: 'products > vegetables',
        },
      },
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['categories']);
  });

  it('should ignore strings with ">" but not proper chevron separators', () => {
    const records = [
      {
        objectID: '1',
        notHierarchical: {
          comparison: 'A>B',
          equation: '5>3',
          text: 'greater>than>symbol',
        },
        validHierarchical: {
          lvl0: 'root',
          lvl1: 'root > child',
        },
      },
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['validHierarchical']);
  });

  it('should detect hierarchical facets with array values', () => {
    const records = [
      {
        objectID: '321432',
        name: 'lemon',
        categories: {
          lvl0: ['products', 'goods'],
          lvl1: ['products > fruits', 'goods > to eat']
        }
      }
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['categories']);
  });

  it('should detect hierarchical facets with mixed string and array values', () => {
    const records = [
      {
        objectID: '1',
        categories: {
          lvl0: 'products',
          lvl1: ['products > fruits', 'products > vegetables']
        },
        taxonomy: {
          tier1: ['animals', 'plants'],
          tier2: 'animals > mammals'
        }
      }
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['categories', 'taxonomy']);
  });

  it('should ignore arrays without chevron separators', () => {
    const records = [
      {
        objectID: '1',
        tags: ['red', 'blue', 'green'],
        categories: ['electronics', 'mobile', 'smartphones'],
        validHierarchy: {
          lvl0: ['products'],
          lvl1: ['products > electronics']
        }
      }
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['validHierarchy']);
  });

  it('should handle arrays with mixed types', () => {
    const records = [
      {
        objectID: '1',
        invalidArray: {
          mixed: ['string', 123, true, 'no chevrons here'],
        },
        validArray: {
          lvl0: ['products'],
          lvl1: ['products > electronics', 'invalid item', 456]
        }
      }
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['validArray']);
  });

  it('should handle empty arrays', () => {
    const records = [
      {
        objectID: '1',
        emptyArray: {
          level0: [],
          level1: ['products > electronics']
        },
        noArrays: {
          level0: 'products',
          level1: 'products > electronics'
        }
      }
    ];

    const result = detectHierarchicalFacets(records);

    expect(result).toEqual(['emptyArray', 'noArrays']);
  });
});
