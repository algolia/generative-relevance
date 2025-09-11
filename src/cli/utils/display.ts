export interface ConfigResult {
  reasoning: string;
  searchableAttributes?: string[];
  customRanking?: string[];
  attributesForFaceting?: string[];
  sortableAttributes?: string[];
  attributeReasons?: Array<{
    attribute: string;
    reason: string;
  }>;
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
    // Create a map of attribute to reason for quick lookup
    const reasonMap = new Map<string, string>();
    if (config.attributeReasons) {
      config.attributeReasons.forEach(item => {
        reasonMap.set(item.attribute, item.reason);
      });
    }

    // Calculate column widths
    let maxAttributeLength = 'ATTRIBUTE'.length;
    let maxReasonLength = 'REASON'.length;

    data.forEach((attr: string) => {
      const attrWithNumber = `${data.indexOf(attr) + 1}. ${attr}`;
      maxAttributeLength = Math.max(maxAttributeLength, attrWithNumber.length);
      const reason = reasonMap.get(attr) || '';
      maxReasonLength = Math.max(maxReasonLength, reason.length);
    });

    // Add padding
    maxAttributeLength += 2;
    maxReasonLength += 2;

    // Ensure minimum widths
    maxAttributeLength = Math.max(maxAttributeLength, 30);
    maxReasonLength = Math.max(maxReasonLength, 40);

    // Display table with attribute reasons
    if (config.attributeReasons && config.attributeReasons.length > 0) {
      console.log('');
      console.log(`${'ATTRIBUTE'.padEnd(maxAttributeLength)}│ REASON`);
      console.log('─'.repeat(maxAttributeLength) + '┼' + '─'.repeat(maxReasonLength));

      data.forEach((attr: string, index: number) => {
        const attrWithNumber = `${index + 1}. ${attr}`;
        // Try multiple lookup strategies for attributeReasons
        // 1. Direct match (attr = "desc(rating)", reason.attribute = "desc(rating)")
        // 2. Base attribute match (attr = "desc(rating)", reason.attribute = "rating")
        // 3. Reverse match (attr = "rating", reason.attribute = "desc(rating)")
        const baseAttr = attr.match(/(?:desc|asc)\((.+)\)|(.+)/);
        const baseAttrName = baseAttr ? (baseAttr[1] || baseAttr[2]) : attr;
        
        let reason = reasonMap.get(attr); // Direct match first
        if (!reason) reason = reasonMap.get(baseAttrName); // Base attribute match
        if (!reason) {
          // Try to find any reason that matches the base attribute
          for (const [reasonAttr, reasonText] of reasonMap.entries()) {
            const baseReasonAttr = reasonAttr.match(/(?:desc|asc)\((.+)\)|(.+)/);
            const baseReasonAttrName = baseReasonAttr ? (baseReasonAttr[1] || baseReasonAttr[2]) : reasonAttr;
            if (baseReasonAttrName === baseAttrName) {
              reason = reasonText;
              break;
            }
          }
        }
        reason = reason || 'No reason provided';
        console.log(`${attrWithNumber.padEnd(maxAttributeLength)}│ ${reason}`);
      });
    } else {
      // Fallback to simple numbered list if no reasons available
      data.forEach((attr: string, index: number) => {
        console.log(`  ${index + 1}. ${attr}`);
      });
    }
  } else {
    console.log('  (No attributes suggested)');
  }

  if (verbose && config.reasoning) {
    console.log('\n💡 Overall Reasoning:');
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

  // Create a map of attribute to reason for quick lookup
  const reasonMap = new Map<string, string>();
  if (aiConfig.attributeReasons) {
    aiConfig.attributeReasons.forEach(item => {
      reasonMap.set(item.attribute, item.reason);
    });
  }

  // Calculate column widths based on longest content
  const maxLength = Math.max(currentConfig.length, aiData?.length || 0);

  // Find the longest strings in each column
  let maxCurrentLength = '📍 CURRENT'.length;
  let maxSuggestedLength = '🤖 AI SUGGESTED'.length;
  let maxReasonLength = 'REASON'.length;

  for (let i = 0; i < maxLength; i++) {
    const current = currentConfig[i] || '';
    const suggested = aiData?.[i] || '';
    const reason = reasonMap.get(suggested) || '';

    const currentWithNumber = `${i + 1}. ${current}`;
    const suggestedWithNumber = `${i + 1}. ${suggested}`;

    maxCurrentLength = Math.max(maxCurrentLength, currentWithNumber.length);
    maxSuggestedLength = Math.max(maxSuggestedLength, suggestedWithNumber.length);
    maxReasonLength = Math.max(maxReasonLength, reason.length);
  }

  // Add some padding
  maxCurrentLength += 2;
  maxSuggestedLength += 2;
  maxReasonLength += 2;

  // Ensure minimum widths
  maxCurrentLength = Math.max(maxCurrentLength, 20);
  maxSuggestedLength = Math.max(maxSuggestedLength, 25);
  maxReasonLength = Math.max(maxReasonLength, 30);

  // Display side-by-side comparison with reasons
  console.log('');
  if (aiConfig.attributeReasons && aiConfig.attributeReasons.length > 0) {
    console.log(`${'📍 CURRENT'.padEnd(maxCurrentLength)}│ ${'🤖 AI SUGGESTED'.padEnd(maxSuggestedLength)}│ REASON`);
    console.log(
      '─'.repeat(maxCurrentLength) + '┼' + '─'.repeat(maxSuggestedLength) + '┼' + '─'.repeat(maxReasonLength)
    );

    for (let i = 0; i < maxLength; i++) {
      const current = currentConfig[i] || '';
      const suggested = aiData?.[i] || '';
      
      // Extract base attribute name for lookup (e.g., "desc(rating)" -> "rating")
      const baseSuggested = suggested.match(/(?:desc|asc)\((.+)\)|(.+)/);
      const baseSuggestedName = baseSuggested ? (baseSuggested[1] || baseSuggested[2]) : suggested;
      const reason = reasonMap.get(baseSuggestedName) || reasonMap.get(suggested) || 'No reason provided';

      const currentWithNumber = `${i + 1}. ${current}`;
      const suggestedWithNumber = `${i + 1}. ${suggested}`;

      console.log(
        `${currentWithNumber.padEnd(maxCurrentLength)}│ ${suggestedWithNumber.padEnd(maxSuggestedLength)}│ ${reason}`
      );
    }

    if (currentConfig.length === 0) {
      console.log(`${'(No current config)'.padEnd(maxCurrentLength)}│ ${''.padEnd(maxSuggestedLength)}│`);
    }

    if (!aiData || aiData.length === 0) {
      console.log(`${''.padEnd(maxCurrentLength)}│ ${'(No AI suggestions)'.padEnd(maxSuggestedLength)}│`);
    }
  } else {
    // Fallback to original two-column format if no reasons available
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
    console.log('\n💡 AI Overall Reasoning:');
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

  // Create reason maps for both models
  const reasonMap1 = new Map<string, string>();
  const reasonMap2 = new Map<string, string>();
  
  if (config1?.attributeReasons) {
    config1.attributeReasons.forEach(item => {
      reasonMap1.set(item.attribute, item.reason);
    });
  }
  
  if (config2?.attributeReasons) {
    config2.attributeReasons.forEach(item => {
      reasonMap2.set(item.attribute, item.reason);
    });
  }

  // Check if we have reasons to show
  const hasReasons = (config1?.attributeReasons?.length || 0) > 0 || (config2?.attributeReasons?.length || 0) > 0;

  // Calculate column widths based on longest content
  const maxLength = Math.max(data1?.length || 0, data2?.length || 0);

  // Find the longest strings in each column
  const model1Header = `🤖 ${model1.toUpperCase()}`;
  const model2Header = `🤖 ${model2.toUpperCase()}`;
  const reasonHeader = 'REASON';
  
  let maxModel1Length = model1Header.length;
  let maxModel2Length = model2Header.length;
  let maxReasonLength = reasonHeader.length;

  for (let i = 0; i < maxLength; i++) {
    const item1 = data1?.[i] || '';
    const item2 = data2?.[i] || '';

    const item1WithNumber = `${i + 1}. ${item1}`;
    const item2WithNumber = `${i + 1}. ${item2}`;

    maxModel1Length = Math.max(maxModel1Length, item1WithNumber.length);
    maxModel2Length = Math.max(maxModel2Length, item2WithNumber.length);
    
    if (hasReasons) {
      const reason1 = reasonMap1.get(item1) || '';
      const reason2 = reasonMap2.get(item2) || '';
      const combinedReason = reason1 || reason2;
      maxReasonLength = Math.max(maxReasonLength, combinedReason.length);
    }
  }

  // Add some padding
  maxModel1Length += 2;
  maxModel2Length += 2;
  maxReasonLength += 2;

  // Ensure minimum widths
  maxModel1Length = Math.max(maxModel1Length, 25);
  maxModel2Length = Math.max(maxModel2Length, 25);
  maxReasonLength = Math.max(maxReasonLength, 30);

  // Display comparison with or without reasons
  console.log('');
  if (hasReasons) {
    console.log(`${model1Header.padEnd(maxModel1Length)}│ ${model2Header.padEnd(maxModel2Length)}│ ${reasonHeader}`);
    console.log(
      '─'.repeat(maxModel1Length) + '┼' + '─'.repeat(maxModel2Length) + '┼' + '─'.repeat(maxReasonLength)
    );

    for (let i = 0; i < maxLength; i++) {
      const item1 = data1?.[i] || '';
      const item2 = data2?.[i] || '';

      const item1WithNumber = item1 ? `${i + 1}. ${item1}` : '';
      const item2WithNumber = item2 ? `${i + 1}. ${item2}` : '';
      
      // Extract base attribute names for lookup (e.g., "desc(rating)" -> "rating")
      const baseItem1 = item1.match(/(?:desc|asc)\((.+)\)|(.+)/);
      const baseItem1Name = baseItem1 ? (baseItem1[1] || baseItem1[2]) : item1;
      const baseItem2 = item2.match(/(?:desc|asc)\((.+)\)|(.+)/);
      const baseItem2Name = baseItem2 ? (baseItem2[1] || baseItem2[2]) : item2;
      
      const reason1 = reasonMap1.get(baseItem1Name) || reasonMap1.get(item1) || '';
      const reason2 = reasonMap2.get(baseItem2Name) || reasonMap2.get(item2) || '';
      const displayReason = reason1 || reason2 || 'No reason provided';

      console.log(
        `${item1WithNumber.padEnd(maxModel1Length)}│ ${item2WithNumber.padEnd(maxModel2Length)}│ ${displayReason}`
      );
    }

    if (!data1 || data1.length === 0) {
      console.log(`${'(No suggestions)'.padEnd(maxModel1Length)}│ ${''.padEnd(maxModel2Length)}│`);
    }

    if (!data2 || data2.length === 0) {
      console.log(`${''.padEnd(maxModel1Length)}│ ${'(No suggestions)'.padEnd(maxModel2Length)}│`);
    }
  } else {
    // Fallback to original two-column format
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
      console.log('\n💡 Model Overall Reasoning:');
      
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