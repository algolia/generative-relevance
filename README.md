# Generative Relevance CLI

A CLI tool for testing AI-powered Algolia configuration generation by analyzing your data and generating intelligent search settings.

## Features

- **AI-Generated Settings**: Leverages AI to determine optimal searchable attributes, custom ranking, and faceting configuration
- **Configuration Comparison**: Compare existing and AI-suggested configurations side-by-side
- **No Indexing Required**: Test configurations without creating Algolia indices
- **Parallel Processing**: Generates all configurations simultaneously
- **Detailed Reasoning**: Understand why attributes were selected

## Prerequisites

- Node.js 22+
- Anthropic account with API Key

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file with your Anthropic API key:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key
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

## Output

The CLI generates four types of AI configuration suggestions:

1. **🔍 Searchable Attributes** - Attributes users can search for
2. **📊 Custom Ranking** - Attributes for relevance ranking
3. **🏷️ Attributes for Faceting** - Attributes for filtering
4. **🔀 Sortable Attributes** - Attributes for sorting results

Each suggestion includes the recommended attributes and optional detailed reasoning (with `--verbose` flag).

## Commands

- `npm start`: Run the CLI
- `npm run build`: Build the TypeScript code
- `npm run lint`: Run ESLint
- `npm test`: Run tests
