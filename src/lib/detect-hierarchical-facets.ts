/**
 * Detects hierarchical facet attributes in Algolia records.
 *
 * Hierarchical facets are objects with string or array values that use chevron
 * separators (">") to indicate hierarchy levels. Key names can be anything, but
 * values must show hierarchical structure.
 *
 * @param records - Array of records to analyze
 *
 * @returns Array of attribute names that contain hierarchical facet structures
 *
 * @example
 * ```typescript
 * const records = [
 *   {
 *     "categories": {
 *       "lvl0": "products",
 *       "lvl1": "products > fruits"
 *     },
 *     "breadcrumbs": {
 *       "level1": "home",
 *       "level2": "home > shop",
 *       "level3": "home > shop > electronics"
 *     },
 *     "taxonomy": {
 *       "lvl0": ["products", "goods"],
 *       "lvl1": ["products > fruits", "goods > to eat"]
 *     }
 *   }
 * ];
 *
 * // Returns ["categories", "breadcrumbs", "taxonomy"]
 * detectHierarchicalFacets(records);
 * ```
 */
export function detectHierarchicalFacets(
  records: Array<Record<string, unknown>>
): string[] {
  const hierarchicalFacets = new Set<string>();

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        const hasHierarchicalValues = Object.values(obj).some((val) => {
          if (typeof val === 'string') {
            return val.includes(' > ');
          }

          if (Array.isArray(val)) {
            return val.some(
              (item) => typeof item === 'string' && item.includes(' > ')
            );
          }

          return false;
        });

        if (hasHierarchicalValues) {
          hierarchicalFacets.add(key);
        }
      }
    }
  }

  return Array.from(hierarchicalFacets);
}
