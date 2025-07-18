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

export function displayDualModelComparison(
  title: string,
  config1: ConfigResult | null,
  config2: ConfigResult | null,
  model1: string,
  model2: string,
  verbose: boolean
) {
  console.log(`${title}`);
  console.log('━'.repeat(50));

  const data1 = config1 ? (
    config1.searchableAttributes ||
    config1.customRanking ||
    config1.attributesForFaceting ||
    config1.sortableAttributes
  ) : null;

  const data2 = config2 ? (
    config2.searchableAttributes ||
    config2.customRanking ||
    config2.attributesForFaceting ||
    config2.sortableAttributes
  ) : null;

  // Calculate column widths based on longest content
  const maxLength = Math.max(data1?.length || 0, data2?.length || 0);

  // Find the longest strings in each column
  const model1Header = `🤖 ${model1.toUpperCase()}`;
  const model2Header = `🤖 ${model2.toUpperCase()}`;
  let maxModel1Length = model1Header.length;
  let maxModel2Length = model2Header.length;

  for (let i = 0; i < maxLength; i++) {
    const item1 = data1?.[i] || '';
    const item2 = data2?.[i] || '';

    const item1WithNumber = `${i + 1}. ${item1}`;
    const item2WithNumber = `${i + 1}. ${item2}`;

    maxModel1Length = Math.max(maxModel1Length, item1WithNumber.length);
    maxModel2Length = Math.max(maxModel2Length, item2WithNumber.length);
  }

  // Add some padding
  maxModel1Length += 2;
  maxModel2Length += 2;

  // Ensure minimum widths
  maxModel1Length = Math.max(maxModel1Length, 25);
  maxModel2Length = Math.max(maxModel2Length, 25);

  // Display side-by-side comparison
  console.log('');
  console.log(`${model1Header.padEnd(maxModel1Length)}│ ${model2Header}`);
  console.log(
    '─'.repeat(maxModel1Length) + '┼' + '─'.repeat(maxModel2Length)
  );

  for (let i = 0; i < maxLength; i++) {
    const item1 = data1?.[i] || '';
    const item2 = data2?.[i] || '';

    const item1WithNumber = item1 ? `${i + 1}. ${item1}` : '';
    const item2WithNumber = item2 ? `${i + 1}. ${item2}` : '';

    console.log(
      `${item1WithNumber.padEnd(maxModel1Length)}│ ${item2WithNumber}`
    );
  }

  if (!data1 || data1.length === 0) {
    console.log(`${'(No suggestions)'.padEnd(maxModel1Length)}│`);
  }

  if (!data2 || data2.length === 0) {
    console.log(`${''.padEnd(maxModel1Length)}│ (No suggestions)`);
  }

  // Show differences
  console.log('');
  const differences = findDifferences(data1 || [], data2 || []);
  if (differences.length > 0) {
    console.log('🔍 Key Differences:');
    differences.forEach((diff, index) => {
      console.log(`  ${index + 1}. ${diff}`);
    });
  } else {
    console.log('✅ Model outputs match!');
  }

  // Show reasoning if verbose mode is enabled
  if (verbose) {
    if (config1?.reasoning || config2?.reasoning) {
      console.log('\n💡 Model Reasoning:');
      
      if (config1?.reasoning) {
        console.log(`\n${model1}:`);
        const reasoning1Lines = config1.reasoning.split('\n');
        reasoning1Lines.forEach((line: string) => {
          console.log(`  ${line}`);
        });
      }
      
      if (config2?.reasoning) {
        console.log(`\n${model2}:`);
        const reasoning2Lines = config2.reasoning.split('\n');
        reasoning2Lines.forEach((line: string) => {
          console.log(`  ${line}`);
        });
      }
    } else {
      console.log('\n💡 No reasoning available for these models');
    }
  }

  console.log('');
}

export function displayTripleComparison(
  title: string,
  currentConfig: string[],
  aiConfig1: ConfigResult | null,
  aiConfig2: ConfigResult | null,
  model1: string,
  model2: string,
  verbose: boolean
) {
  console.log(`${title}`);
  console.log('━'.repeat(80));

  const aiData1 = aiConfig1 ? (
    aiConfig1.searchableAttributes ||
    aiConfig1.customRanking ||
    aiConfig1.attributesForFaceting ||
    aiConfig1.sortableAttributes
  ) : null;

  const aiData2 = aiConfig2 ? (
    aiConfig2.searchableAttributes ||
    aiConfig2.customRanking ||
    aiConfig2.attributesForFaceting ||
    aiConfig2.sortableAttributes
  ) : null;

  // Calculate column widths based on longest content
  const maxLength = Math.max(
    currentConfig.length,
    aiData1?.length || 0,
    aiData2?.length || 0
  );

  // Headers
  const currentHeader = '📍 CURRENT';
  const model1Header = `🤖 ${model1.toUpperCase()}`;
  const model2Header = `🤖 ${model2.toUpperCase()}`;
  
  let maxCurrentLength = currentHeader.length;
  let maxModel1Length = model1Header.length;
  let maxModel2Length = model2Header.length;

  for (let i = 0; i < maxLength; i++) {
    const current = currentConfig[i] || '';
    const ai1 = aiData1?.[i] || '';
    const ai2 = aiData2?.[i] || '';

    const currentWithNumber = current ? `${i + 1}. ${current}` : '';
    const ai1WithNumber = ai1 ? `${i + 1}. ${ai1}` : '';
    const ai2WithNumber = ai2 ? `${i + 1}. ${ai2}` : '';

    maxCurrentLength = Math.max(maxCurrentLength, currentWithNumber.length);
    maxModel1Length = Math.max(maxModel1Length, ai1WithNumber.length);
    maxModel2Length = Math.max(maxModel2Length, ai2WithNumber.length);
  }

  // Add padding and ensure minimum widths
  maxCurrentLength = Math.max(maxCurrentLength + 2, 20);
  maxModel1Length = Math.max(maxModel1Length + 2, 20);
  maxModel2Length = Math.max(maxModel2Length + 2, 20);

  // Display three-column comparison
  console.log('');
  console.log(`${currentHeader.padEnd(maxCurrentLength)}│ ${model1Header.padEnd(maxModel1Length)}│ ${model2Header}`);
  console.log(
    '─'.repeat(maxCurrentLength) + '┼' + '─'.repeat(maxModel1Length) + '┼' + '─'.repeat(maxModel2Length)
  );

  for (let i = 0; i < maxLength; i++) {
    const current = currentConfig[i] || '';
    const ai1 = aiData1?.[i] || '';
    const ai2 = aiData2?.[i] || '';

    const currentWithNumber = current ? `${i + 1}. ${current}` : '';
    const ai1WithNumber = ai1 ? `${i + 1}. ${ai1}` : '';
    const ai2WithNumber = ai2 ? `${i + 1}. ${ai2}` : '';

    console.log(
      `${currentWithNumber.padEnd(maxCurrentLength)}│ ${ai1WithNumber.padEnd(maxModel1Length)}│ ${ai2WithNumber}`
    );
  }

  if (currentConfig.length === 0) {
    console.log(`${'(No current config)'.padEnd(maxCurrentLength)}│ ${''.padEnd(maxModel1Length)}│`);
  }

  if (!aiData1 || aiData1.length === 0) {
    console.log(`${''.padEnd(maxCurrentLength)}│ ${'(No suggestions)'.padEnd(maxModel1Length)}│`);
  }

  if (!aiData2 || aiData2.length === 0) {
    console.log(`${''.padEnd(maxCurrentLength)}│ ${''.padEnd(maxModel1Length)}│ (No suggestions)`);
  }

  // Show differences between models
  console.log('');
  const differences = findDifferences(aiData1 || [], aiData2 || []);
  if (differences.length > 0) {
    console.log(`🔍 Differences between ${model1} and ${model2}:`);
    differences.forEach((diff, index) => {
      console.log(`  ${index + 1}. ${diff}`);
    });
  } else {
    console.log('✅ AI model outputs match!');
  }

  // Show reasoning if verbose mode is enabled
  if (verbose) {
    if (aiConfig1?.reasoning || aiConfig2?.reasoning) {
      console.log('\n💡 Model Reasoning:');
      
      if (aiConfig1?.reasoning) {
        console.log(`\n${model1}:`);
        const reasoning1Lines = aiConfig1.reasoning.split('\n');
        reasoning1Lines.forEach((line: string) => {
          console.log(`  ${line}`);
        });
      }
      
      if (aiConfig2?.reasoning) {
        console.log(`\n${model2}:`);
        const reasoning2Lines = aiConfig2.reasoning.split('\n');
        reasoning2Lines.forEach((line: string) => {
          console.log(`  ${line}`);
        });
      }
    } else {
      console.log('\n💡 No reasoning available for these models');
    }
  }

  console.log('');
}