export function validateAttributes(
  attributes: string[],
  records: Array<Record<string, unknown>>,
  setting: string
): string[] {
  if (records.length === 0) {
    return [];
  }

  const allAttributeNames = new Set<string>();

  records.forEach((record) => {
    Object.entries(record).forEach(([key, value]) => {
      // Only consider attributes with defined values
      if (value !== undefined) {
        allAttributeNames.add(key);
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value).forEach(([subKey, subValue]) => {
          // Only consider sub-attributes with defined values
          if (subValue !== undefined) {
            allAttributeNames.add(`${key}.${subKey}`);
          }
        });
      } else if (Array.isArray(value)) {
        // Handle array format hierarchical facets
        value.forEach((item) => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            Object.entries(item).forEach(([subKey, subValue]) => {
              if (subValue !== undefined) {
                allAttributeNames.add(`${key}.${subKey}`);
              }
            });
          }
        });
      }
    });
  });

  const validAttributes = attributes.filter((attribute) => {
    const baseAttribute = getBaseAttribute(attribute);
    // Necessary of searchable attributes where attributes can be comma-separated
    const splitAttributes = baseAttribute.split(',');
    const exists = splitAttributes.every((x) => allAttributeNames.has(x));

    if (!exists) {
      console.warn(
        `${setting}: Filtered out non-existent attribute: ${attribute} (base: ${baseAttribute})`
      );
    }

    return exists;
  });

  return validAttributes;
}

function getBaseAttribute(attribute: string): string {
  const match = attribute.match(
    /^(?:asc|desc|ordered|unordered|searchable|filterOnly)\((.+)\)$/
  );

  return match ? match[1] : attribute;
}
