export interface ConfigResult {
  reasoning: string;
  searchableAttributes?: string[];
  customRanking?: string[];
  attributesForFaceting?: string[];
  sortableAttributes?: string[];
}

export function displaySection(
  title: string,
  config: ConfigResult,
  verbose: boolean
) {
  console.log(`${title}`);
  console.log('─'.repeat(50));

  const data =
    config.searchableAttributes ||
    config.customRanking ||
    config.attributesForFaceting ||
    config.sortableAttributes;

  if (data && data.length > 0) {
    data.forEach((attr: string, index: number) => {
      console.log(`  ${index + 1}. ${attr}`);
    });
  } else {
    console.log('  (No attributes suggested)');
  }

  if (verbose && config.reasoning) {
    console.log('\n💡 Reasoning:');
    const reasoningLines = config.reasoning.split('\n');

    reasoningLines.forEach((line: string) => {
      console.log(`  ${line}`);
    });
  } else if (verbose && !config.reasoning) {
    console.log('\n💡 No reasoning available for this section');
  }

  console.log('');
}

export function displayComparison(
  title: string,
  currentConfig: string[],
  aiConfig: ConfigResult,
  verbose: boolean
) {
  console.log(`${title}`);
  console.log('━'.repeat(50));

  const aiData =
    aiConfig.searchableAttributes ||
    aiConfig.customRanking ||
    aiConfig.attributesForFaceting ||
    aiConfig.sortableAttributes;

  // Calculate column widths based on longest content
  const maxLength = Math.max(currentConfig.length, aiData?.length || 0);

  // Find the longest strings in each column
  let maxCurrentLength = '📍 CURRENT'.length;
  let maxSuggestedLength = '🤖 AI SUGGESTED'.length;

  for (let i = 0; i < maxLength; i++) {
    const current = currentConfig[i] || '';
    const suggested = aiData?.[i] || '';

    const currentWithNumber = `${i + 1}. ${current}`;
    const suggestedWithNumber = `${i + 1}. ${suggested}`;

    maxCurrentLength = Math.max(maxCurrentLength, currentWithNumber.length);
    maxSuggestedLength = Math.max(
      maxSuggestedLength,
      suggestedWithNumber.length
    );
  }

  // Add some padding
  maxCurrentLength += 2;
  maxSuggestedLength += 2;

  // Ensure minimum widths
  maxCurrentLength = Math.max(maxCurrentLength, 20);
  maxSuggestedLength = Math.max(maxSuggestedLength, 25);

  // Display side-by-side comparison
  console.log('');
  console.log(`${'📍 CURRENT'.padEnd(maxCurrentLength)}│ 🤖 AI SUGGESTED`);
  console.log(
    '─'.repeat(maxCurrentLength) + '┼' + '─'.repeat(maxSuggestedLength)
  );

  for (let i = 0; i < maxLength; i++) {
    const current = currentConfig[i] || '';
    const suggested = aiData?.[i] || '';

    const currentWithNumber = `${i + 1}. ${current}`;
    const suggestedWithNumber = `${i + 1}. ${suggested}`;

    console.log(
      `${currentWithNumber.padEnd(maxCurrentLength)}│ ${suggestedWithNumber}`
    );
  }

  if (currentConfig.length === 0) {
    console.log(`${'(No current config)'.padEnd(maxCurrentLength)}│ `);
  }

  if (!aiData || aiData.length === 0) {
    console.log(`${''.padEnd(maxCurrentLength)}│ (No AI suggestions)`);
  }

  // Show differences
  console.log('');
  const differences = findDifferences(currentConfig, aiData || []);
  if (differences.length > 0) {
    console.log('🔍 Key Differences:');
    differences.forEach((diff, index) => {
      console.log(`  ${index + 1}. ${diff}`);
    });
  } else {
    console.log('✅ Configurations match!');
  }

  if (verbose && aiConfig.reasoning) {
    console.log('\n💡 AI Reasoning:');
    const reasoningLines = aiConfig.reasoning.split('\n');
    reasoningLines.forEach((line: string) => {
      console.log(`  ${line}`);
    });
  } else if (verbose && !aiConfig.reasoning) {
    console.log('\n💡 No reasoning available for this section');
  }

  console.log('');
}

function findDifferences(current: string[], suggested: string[]): string[] {
  const differences: string[] = [];

  // Items in current but not in suggested
  const removedItems = current.filter((item) => !suggested.includes(item));
  if (removedItems.length > 0) {
    differences.push(`Removed: ${removedItems.join(', ')}`);
  }

  // Items in suggested but not in current
  const addedItems = suggested.filter((item) => !current.includes(item));
  if (addedItems.length > 0) {
    differences.push(`Added: ${addedItems.join(', ')}`);
  }

  // Order changes (if both have same items but different order)
  if (
    current.length === suggested.length &&
    current.every((item) => suggested.includes(item)) &&
    suggested.every((item) => current.includes(item)) &&
    current.join(',') !== suggested.join(',')
  ) {
    differences.push('Order changed');
  }

  return differences;
}