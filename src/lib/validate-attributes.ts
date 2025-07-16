export function validateAttributes(
  attributes: string[],
  records: Array<Record<string, unknown>>
): string[] {
  if (records.length === 0) {
    return [];
  }

  const allAttributeNames = new Set<string>();

  records.forEach((record) => {
    Object.keys(record).forEach((key) => {
      allAttributeNames.add(key);
    });
  });

  function getBaseAttribute(attribute: string): string {
    const match = attribute.match(
      /^(?:asc|desc|ordered|unordered|searchable|filterOnly)\((.+)\)$/
    );

    return match ? match[1] : attribute;
  }

  const validAttributes = attributes.filter((attribute) => {
    const baseAttribute = getBaseAttribute(attribute);
    const exists = allAttributeNames.has(baseAttribute);

    if (!exists) {
      console.warn(
        `Filtered out non-existent attribute: ${attribute} (base: ${baseAttribute})`
      );
    }

    return exists;
  });

  return validAttributes;
}
