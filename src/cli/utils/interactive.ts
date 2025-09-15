import inquirer from 'inquirer';

export interface InteractiveOptions {
  appId: string;
  apiKey: string;
  indexName: string;
}

export interface ConfigurationSection {
  title: string;
  type:
    | 'searchableAttributes'
    | 'customRanking'
    | 'attributesForFaceting'
    | 'sortableAttributes';
  config: string[];
  reasoning?: string;
  attributeReasons?: { attribute: string; reason: string }[];
}

export async function promptApplyConfiguration(
  sections: ConfigurationSection[],
  options: InteractiveOptions
): Promise<void> {
  console.log('\n🤖 Ready to apply AI suggestions to your Algolia index!');
  console.log(`📍 App ID: ${options.appId}`);
  console.log(`📍 Index: ${options.indexName}\n`);

  const { proceedWithAny } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceedWithAny',
      message: 'Would you like to apply any of these configurations?',
      default: true,
    },
  ]);

  if (!proceedWithAny) {
    console.log('👋 No changes applied. Exiting...');
    return;
  }

  // Ask which sections to apply
  const { sectionsToApply } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'sectionsToApply',
      message: 'Select which configurations to apply:',
      choices: sections.map((section, index) => ({
        name: `${section.title} (${section.config.length} items)`,
        value: index,
        checked: true,
      })),
    },
  ]);

  if (sectionsToApply.length === 0) {
    console.log('👋 No configurations selected. Exiting...');
    return;
  }

  // Show preview and confirm
  console.log('\n📋 Preview of changes to be applied:');
  sectionsToApply.forEach((index: number) => {
    const section = sections[index];
    console.log(`\n${section.title}:`);
    section.config.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
  });

  const { confirmApply } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmApply',
      message: '⚠️  Apply these changes to your Algolia index?',
      default: false,
    },
  ]);

  if (!confirmApply) {
    console.log('👋 Changes cancelled. No modifications made.');
    return;
  }

  // Apply configurations
  console.log('\n🚀 Applying configurations...');

  for (const sectionIndex of sectionsToApply) {
    const section = sections[sectionIndex];
    console.log(`⏳ Applying ${section.title}...`);

    try {
      await applyConfigurationToIndex(section, options);
      console.log(`✅ ${section.title} applied successfully`);
    } catch (error) {
      console.error(`❌ Failed to apply ${section.title}:`, error);
    }
  }

  console.log('\n🎉 Configuration application completed!');
}

async function applyConfigurationToIndex(
  section: ConfigurationSection,
  options: InteractiveOptions
): Promise<void> {
  const { searchClient } = await import('./algolia');
  const client = searchClient(options.appId, options.apiKey);

  if (section.type === 'sortableAttributes') {
    await applySortableAttributes(section, options, client);
  } else {
    const settings: Record<string, any> = {};

    switch (section.type) {
      case 'searchableAttributes':
        settings.searchableAttributes = section.config;
        break;
      case 'customRanking':
        settings.customRanking = section.config;
        break;
      case 'attributesForFaceting':
        settings.attributesForFaceting = section.config;
        break;
    }

    await client.setSettings({
      indexName: options.indexName,
      indexSettings: settings,
    });
  }
}

async function applySortableAttributes(
  section: ConfigurationSection,
  options: InteractiveOptions,
  client: any
): Promise<void> {
  console.log('  📋 Creating replica indexes for sortable attributes...');

  // Get current settings to check for existing replicas
  const currentSettings = await client.getSettings({
    indexName: options.indexName,
  });
  const existingReplicas = currentSettings.replicas || [];

  const replicasToCreate: string[] = [];
  const replicaSettings: Record<string, any> = {};

  // Process each sortable attribute
  for (const sortAttribute of section.config) {
    // Extract attribute name and direction from formats like "desc(price)" or "asc(date)"
    const match = sortAttribute.match(/^(asc|desc)\((.+)\)$/);
    if (!match) {
      console.log(`  ⚠️  Skipping invalid sort format: ${sortAttribute}`);
      continue;
    }

    const [, direction, attribute] = match;
    const replicaName = `${options.indexName}_${attribute}_${direction}`;

    // Skip if replica already exists
    if (existingReplicas.includes(replicaName)) {
      console.log(`  ✓ Replica ${replicaName} already exists`);
      continue;
    }

    replicasToCreate.push(replicaName);

    // Prepare settings for this replica (ranking with the sort attribute first)
    replicaSettings[replicaName] = {
      ranking: [
        sortAttribute,
        'typo',
        'geo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom',
      ],
    };
  }

  if (replicasToCreate.length > 0) {
    console.log(
      `  📝 Adding ${replicasToCreate.length} new replicas to main index...`
    );

    // First, add replica names to the main index
    const allReplicas = [...existingReplicas, ...replicasToCreate];
    await client.setSettings({
      indexName: options.indexName,
      indexSettings: { replicas: allReplicas },
    });

    console.log('  ⏳ Waiting for replicas to be created...');
    // Wait a bit for replicas to be created
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Then configure each replica with its specific ranking
    for (const replicaName of replicasToCreate) {
      console.log(`  🔧 Configuring replica ${replicaName}...`);
      try {
        await client.setSettings({
          indexName: replicaName,
          indexSettings: replicaSettings[replicaName],
        });
        console.log(`  ✅ Replica ${replicaName} configured successfully`);
      } catch (error) {
        console.error(
          `  ❌ Failed to configure replica ${replicaName}:`,
          error
        );
      }
    }
  } else {
    console.log('  ✓ All required replicas already exist');
  }
}

export async function promptAnalyzeResults(
  hasAlgoliaCredentials: boolean
): Promise<{ shouldApply: boolean; credentials?: InteractiveOptions }> {
  if (!hasAlgoliaCredentials) {
    const { wantToApply } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'wantToApply',
        message:
          '🔧 Would you like to apply these configurations to an Algolia index?',
        default: false,
      },
    ]);

    if (!wantToApply) {
      return { shouldApply: false };
    }

    const credentials = await inquirer.prompt([
      {
        type: 'input',
        name: 'appId',
        message: 'Enter your Algolia App ID:',
        validate: (input: string) =>
          input.trim().length > 0 || 'App ID is required',
      },
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Algolia Admin API Key:',
        validate: (input: string) =>
          input.trim().length > 0 || 'API Key is required',
      },
      {
        type: 'input',
        name: 'indexName',
        message: 'Enter the index name to update:',
        validate: (input: string) =>
          input.trim().length > 0 || 'Index name is required',
      },
    ]);

    return { shouldApply: true, credentials };
  }

  const { shouldApply } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldApply',
      message: '🔧 Apply these configurations to your Algolia index?',
      default: false,
    },
  ]);

  return { shouldApply };
}
