export function validateAttributes(
  attributes: string[],
  records: Array<Record<string, unknown>>,
  setting: string
): string[] {
  if (records.length === 0) {
    return [];
  }

  const allAttributeNames = new Set<string>();

  function collectAttributes(obj: unknown, prefix = ''): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    if (Array.isArray(obj)) {
      // Handle arrays - collect attributes from each item
      obj.forEach((item) => collectAttributes(item, prefix));
    } else {
      // Handle objects - collect all nested attributes
      Object.entries(obj).forEach(([key, value]) => {
        if (value !== undefined) {
          const attributePath = prefix ? `${prefix}.${key}` : key;
          allAttributeNames.add(attributePath);
          // Recursively collect nested attributes
          collectAttributes(value, attributePath);
        }
      });
    }
  }

  records.forEach((record) => {
    collectAttributes(record);
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
