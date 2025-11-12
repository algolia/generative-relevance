import { describe, it, expect } from 'vitest';
import { validateAttributes } from './validate-attributes';

describe('validateAttributes', () => {
  it('should return valid attributes that exist in records', () => {
    const records = [
      {
        objectID: '1',
        name: 'Product 1',
        category: 'electronics',
        brand: 'Apple',
      },
    ];

    const attributes = ['name', 'category', 'brand', 'nonExistent'];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual(['name', 'category', 'brand']);
  });

  it('should validate nested object attributes', () => {
    const records = [
      {
        objectID: '1',
        metadata: {
          source: 'api',
          quality: 'high',
        },
      },
    ];

    const attributes = [
      'metadata.source',
      'metadata.quality',
      'metadata.missing',
    ];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual(['metadata.source', 'metadata.quality']);
  });

  it('should validate hierarchical facet levels', () => {
    const records = [
      {
        objectID: '1',
        categories: {
          lvl0: 'products',
          lvl1: 'products > electronics',
          lvl2: 'products > electronics > phones',
        },
      },
    ];

    const attributes = [
      'categories.lvl0',
      'categories.lvl1',
      'categories.lvl2',
      'categories.lvl3', // This should be invalid - doesn't exist in data
      'nonHierarchical.lvl0', // This should be invalid
    ];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual([
      'categories.lvl0',
      'categories.lvl1',
      'categories.lvl2',
    ]);
  });

  it('should validate hierarchical facet levels with array format', () => {
    const records = [
      {
        objectID: '1',
        hierarchical_categories: [
          {
            lvl0: 'Cable',
            lvl1: 'Cable > Power cable',
            lvl2: 'Cable > Power cable > Distribution Cable',
          },
        ],
      },
    ];

    const attributes = [
      'hierarchical_categories.lvl0',
      'hierarchical_categories.lvl1',
      'hierarchical_categories.lvl2',
      'hierarchical_categories.lvl5', // Should be invalid - doesn't exist in data
    ];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual([
      'hierarchical_categories.lvl0',
      'hierarchical_categories.lvl1',
      'hierarchical_categories.lvl2',
    ]);
  });

  it('should handle attributes with modifiers', () => {
    const records = [
      {
        objectID: '1',
        brand: 'Apple',
        categories: {
          lvl0: 'products',
          lvl1: 'products > electronics',
        },
      },
    ];

    const attributes = [
      'searchable(brand)',
      'filterOnly(categories.lvl0)',
      'asc(categories.lvl1)',
      'desc(nonExistent)',
    ];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual([
      'searchable(brand)',
      'filterOnly(categories.lvl0)',
      'asc(categories.lvl1)',
    ]);
  });

  it('should handle comma-separated attributes', () => {
    const records = [
      {
        objectID: '1',
        name: 'Product',
        brand: 'Apple',
        missing: undefined,
      },
    ];

    const attributes = ['name,brand', 'name,missing', 'missing,brand'];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual(['name,brand']);
  });

  it('should return empty array for empty records', () => {
    const records: Array<Record<string, unknown>> = [];
    const attributes = ['any', 'attributes'];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual([]);
  });

  it('should validate any existing attributes regardless of hierarchical structure', () => {
    const records = [
      {
        objectID: '1',
        regularObject: {
          lvl0: 'not hierarchical', // No chevron separators
          lvl1: 'also not hierarchical',
        },
        validHierarchical: {
          lvl0: 'products',
          lvl1: 'products > electronics',
        },
      },
    ];

    const attributes = [
      'regularObject.lvl0', // Should be valid (exists in data)
      'regularObject.lvl1', // Should be valid (exists in data)
      'regularObject.lvl5', // Should be invalid (doesn't exist)
      'validHierarchical.lvl0', // Should be valid (exists in data)
      'validHierarchical.lvl1', // Should be valid (exists in data)
      'validHierarchical.lvl5', // Should be invalid (doesn't exist)
    ];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual([
      'regularObject.lvl0',
      'regularObject.lvl1',
      'validHierarchical.lvl0',
      'validHierarchical.lvl1',
    ]);
  });

  it('should handle mixed hierarchical and regular attributes', () => {
    const records = [
      {
        objectID: '1',
        name: 'Product',
        categories: {
          lvl0: 'products',
          lvl1: 'products > electronics',
        },
        metadata: {
          source: 'api',
        },
      },
    ];

    const attributes = [
      'name',
      'categories.lvl0',
      'categories.lvl10', // Should be invalid (hierarchical but lvl10 doesn't exist)
      'metadata.source',
      'metadata.lvl0', // Should be invalid (not hierarchical)
      'nonExistent.lvl0', // Should be invalid
    ];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual(['name', 'categories.lvl0', 'metadata.source']);
  });

  it('should handle infinitely nested attributes', () => {
    const records = [
      {
        objectID: '1',
        user: {
          profile: {
            preferences: {
              theme: 'dark',
              notifications: {
                email: {
                  marketing: true,
                  updates: false
                }
              }
            }
          },
          name: 'John'
        },
        settings: {
          privacy: {
            data: {
              sharing: 'limited'
            }
          }
        }
      },
    ];

    const attributes = [
      'user.profile.preferences.theme',
      'user.profile.preferences.notifications.email.marketing',
      'user.profile.preferences.notifications.email.updates',
      'settings.privacy.data.sharing',
      'user.name',
      'user.profile.nonexistent', // Should be invalid
      'user.profile.preferences.missing.value', // Should be invalid
    ];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual([
      'user.profile.preferences.theme',
      'user.profile.preferences.notifications.email.marketing',
      'user.profile.preferences.notifications.email.updates',
      'settings.privacy.data.sharing',
      'user.name',
    ]);
  });

  it('should handle nested arrays with objects', () => {
    const records = [
      {
        objectID: '1',
        products: [
          {
            specs: {
              technical: {
                weight: '2.1kg'
              }
            }
          },
          {
            specs: {
              technical: {
                weight: '1.8kg',
                dimensions: '30x20x5cm'
              }
            }
          }
        ]
      },
    ];

    const attributes = [
      'products.specs.technical.weight',
      'products.specs.technical.dimensions',
      'products.specs.technical.unavailable', // Should be invalid
    ];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual([
      'products.specs.technical.weight',
      'products.specs.technical.dimensions',
    ]);
  });

  it('should handle mixed arrays and objects at deep levels', () => {
    const records = [
      {
        objectID: '1',
        inventory: {
          warehouses: [
            {
              location: {
                details: {
                  country: 'USA',
                  zones: ['north', 'south']
                }
              }
            }
          ]
        }
      },
    ];

    const attributes = [
      'inventory.warehouses.location.details.country',
      'inventory.warehouses.location.details.zones',
      'inventory.warehouses.location.details.nonexistent', // Should be invalid
    ];
    const result = validateAttributes(attributes, records, 'Test');

    expect(result).toEqual([
      'inventory.warehouses.location.details.country',
      'inventory.warehouses.location.details.zones',
    ]);
  });
});
