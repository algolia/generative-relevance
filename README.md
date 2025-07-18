# Generative Relevance CLI

A CLI tool for testing AI-powered Algolia configuration generation by analyzing your data and generating intelligent search settings.

## Features

- **AI-Generated Settings**: Leverages AI to determine optimal searchable attributes, custom ranking, and faceting configuration
- **Configuration Comparison**: Compare existing and AI-suggested configurations side-by-side
- **No Indexing Required**: Test configurations without creating Algolia indices
- **Parallel Processing**: Generates all configurations simultaneously
- **Selective Generation**: Generates only the configuration you want
- **Detailed Reasoning**: Understand why attributes were selected

## Prerequisites

- Node.js 22+
- Anthropic account with API Key (for Claude models)
- OpenAI account with API Key (for OpenAI models like o3-mini)

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file with the appropriate API keys:

For Claude models (default):
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

For OpenAI models (o3-mini):
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

For both providers:
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

### Analyze JSON Records

Generate AI configuration suggestions from a JSON file containing records:

```bash
npm start -- analyze <json-file> [options]
```

**Arguments:**
- `<json-file>` - Path to JSON file containing an array of records

**Options:**
- `-l, --limit <number>` - Number of records to analyze (default: 10)
- `-v, --verbose` - Show detailed reasoning for each configuration
- `--searchable` - Generate searchable attributes only
- `--ranking` - Generate custom ranking only
- `--faceting` - Generate attributes for faceting only
- `--sortable` - Generate sortable attributes only
- `-m, --model <model>` - AI model to use (claude-3-5-haiku-latest, claude-3-5-sonnet-latest, o3-mini)
- `--compare-models <models>` - Compare two models (format: model1,model2)
- `-h, --help` - Display help for command

### Compare with Existing Index

Compare existing Algolia index settings with AI suggestions:

```bash
npm start -- compare <appId> <apiKey> <indexName> [options]
```

**Arguments:**
- `<appId>` - Your Algolia App ID
- `<apiKey>` - Your Algolia Admin API Key
- `<indexName>` - Name of the Algolia index to compare

**Options:**
- `-l, --limit <number>` - Number of records to analyze (default: 10)
- `-v, --verbose` - Show detailed reasoning for each configuration
- `--searchable` - Compare searchable attributes only
- `--ranking` - Compare custom ranking only
- `--faceting` - Compare attributes for faceting only
- `--sortable` - Compare sortable attributes only
- `-m, --model <model>` - AI model to use (claude-3-5-haiku-latest, claude-3-5-sonnet-latest, o3-mini)
- `--compare-models <models>` - Compare two models (format: model1,model2)
- `-h, --help` - Display help for command

## Examples

### Analyze Examples

Basic analysis:
```bash
npm start -- analyze datasets/products/clean.json
```

Analyze with detailed reasoning:
```bash
npm start -- analyze datasets/products/clean.json --verbose
```

Limit to 5 records with verbose output:
```bash
npm start -- analyze datasets/products/clean.json --limit 5 --verbose
```

Generate only searchable attributes:
```bash
npm start -- analyze datasets/products/clean.json --searchable
```

Generate only custom ranking:
```bash
npm start -- analyze datasets/products/clean.json --ranking --verbose
```

Generate faceting and sortable attributes:
```bash
npm start -- analyze datasets/products/clean.json --faceting --sortable
```

Use Claude 3.5 Sonnet model:
```bash
npm start -- analyze datasets/products/clean.json --model claude-3-5-sonnet-latest
```

Use OpenAI o3-mini model:
```bash
npm start -- analyze datasets/products/clean.json --model o3-mini
```

Use o3-mini with specific configuration types:
```bash
npm start -- analyze datasets/products/clean.json --model o3-mini --searchable --ranking --verbose
```

Compare two models side-by-side:
```bash
npm start -- analyze datasets/products/clean.json --compare-models claude-3-5-sonnet-latest,o3-mini
```

Compare models with verbose reasoning:
```bash
npm start -- analyze datasets/products/clean.json --compare-models claude-3-5-haiku-latest,claude-3-5-sonnet-latest --verbose
```

### Compare Examples

Compare existing index with AI suggestions:
```bash
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name
```

Compare with verbose reasoning:
```bash
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --verbose
```

Compare with limited sample size:
```bash
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --limit 20 --verbose
```

Compare only searchable attributes:
```bash
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --searchable
```

Compare only custom ranking:
```bash
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --ranking --verbose
```

Use Claude 3.5 Sonnet model for comparison:
```bash
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --model claude-3-5-sonnet-latest
```

Use OpenAI o3-mini for comparison:
```bash
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --model o3-mini --verbose
```

Compare index with two AI models:
```bash
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --compare-models claude-3-5-sonnet-latest,o3-mini
```

Triple comparison with verbose output:
```bash
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --compare-models claude-3-5-haiku-latest,claude-3-5-sonnet-latest --verbose
```

## Output

The CLI generates four types of AI configuration suggestions:

1. **🔍 Searchable Attributes** - Attributes users can search for
2. **📊 Custom Ranking** - Attributes for relevance ranking
3. **🏷️ Attributes for Faceting** - Attributes for filtering
4. **🔀 Sortable Attributes** - Attributes for sorting results

Each suggestion includes the recommended attributes and optional detailed reasoning (with `--verbose` flag).

## Dual-Model Comparison

The CLI supports comparing outputs from two different AI models simultaneously:

### For Analysis (`analyze` command):
- Compare two models side-by-side to see different AI perspectives
- Useful for understanding model differences and choosing the best approach
- Shows differences between model outputs and individual reasoning

### For Index Comparison (`compare` command):
- Triple comparison: Current Index vs Model 1 vs Model 2
- See how different AI models would improve your existing configuration
- Identify consensus recommendations and model-specific suggestions

### Benefits:
- **Quality Assurance**: Cross-validate recommendations across models
- **Model Selection**: Choose the best model for your specific use case
- **Insight Generation**: Understand different AI reasoning approaches
- **Cost Optimization**: Compare expensive vs. cost-effective models

## Model Selection

The CLI supports multiple AI models with different capabilities:

### Claude Models (Anthropic)
- **`claude-3-5-haiku-latest`** (default): Fastest and most cost-effective, good for quick analysis
- **`claude-3-5-sonnet-latest`**: Balanced performance and quality, recommended for most use cases

### OpenAI Models
- **`o3-mini`**: OpenAI's latest reasoning model, optimized for fast performance and cost-effectiveness

Choose based on your needs:
- Use **Haiku** for rapid prototyping and development
- Use **Sonnet** for production analysis and detailed insights
- Use **Opus** for complex datasets requiring nuanced understanding
- Use **o3-mini** for OpenAI's reasoning capabilities at a lower cost

## Commands

- `npm start`: Run the CLI
- `npm run build`: Build the TypeScript code
- `npm run lint`: Run ESLint
- `npm test`: Run tests
