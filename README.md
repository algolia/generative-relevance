# Generative Relevance

Demo of an AI-powered tool that automatically optimizes Algolia search configurations by analyzing your data and generating intelligent search settings.

## Features

- **AI-Generated Settings**: Leverages AI to determine optimal searchable attributes, custom ranking, and faceting configuration
- **Smart Replica Management**: Automatically creates sort-by replicas for relevant fields
- **Configuration Comparison**: Compare existing and AI-suggested configurations side-by-side
- **CLI Tool**: Test AI configurations in your terminal

## Getting Started

### Prerequisites

- Node.js 22+
- Anthropic account with API Key

### Environment Variables

Create a `.env` file with your Anthropic API key:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## CLI Tool

A command-line tool for testing AI-powered Algolia configuration generation without indexing.

### CLI Usage

#### Analyze JSON Records

Generate AI configuration suggestions from a JSON file containing records:

```bash
npm run cli analyze <json-file> [options]
```

**Arguments:**
- `<json-file>` - Path to JSON file containing an array of records

**Options:**
- `-l, --limit <number>` - Number of records to analyze (default: 10)
- `-v, --verbose` - Show detailed reasoning for each configuration
- `-h, --help` - Display help for command

#### Compare with Existing Index

Compare existing Algolia index settings with AI suggestions:

```bash
npm run cli compare <appId> <apiKey> <indexName> [options]
```

**Arguments:**
- `<appId>` - Your Algolia App ID
- `<apiKey>` - Your Algolia Admin API Key
- `<indexName>` - Name of the Algolia index to compare

**Options:**
- `-l, --limit <number>` - Number of records to analyze (default: 10)
- `-v, --verbose` - Show detailed reasoning for each configuration
- `-h, --help` - Display help for command

### CLI Examples

#### Analyze Examples

Basic analysis:
```bash
npm run cli analyze examples/products.json
```

Analyze with detailed reasoning:
```bash
npm run cli analyze examples/products.json -- --verbose
```

Limit to 5 records with verbose output:
```bash
npm run cli analyze examples/movies.json -- --limit 5 --verbose
```

#### Compare Examples

Compare existing index with AI suggestions:
```bash
npm run cli compare YOUR_APP_ID YOUR_API_KEY your_index_name
```

Compare with verbose reasoning:
```bash
npm run cli compare YOUR_APP_ID YOUR_API_KEY your_index_name -- --verbose
```

Compare with limited sample size:
```bash
npm run cli compare YOUR_APP_ID YOUR_API_KEY your_index_name -- --limit 20 --verbose
```

### CLI Output

The CLI generates four types of AI configuration suggestions:

1. **🔍 Searchable Attributes** - Attributes users can search for
2. **📊 Custom Ranking** - Attributes for relevance ranking
3. **🏷️ Attributes for Faceting** - Attributes for filtering
4. **🔀 Sortable Attributes** - Attributes for sorting results

Each suggestion includes the recommended attributes and optional detailed reasoning (with `--verbose` flag).

### CLI Features

- **No Indexing Required** - Test configurations without creating Algolia indices
- **Parallel Processing** - Generates all configurations simultaneously
- **Detailed Reasoning** - Understand why attributes were selected
- **Flexible Input** - Works with any JSON array of records
- **Fast Testing** - Quickly iterate on different datasets
- **Index Comparison** - Compare existing Algolia index settings with AI suggestions
- **Side-by-Side Display** - Visual comparison showing current vs suggested configurations
- **Difference Detection** - Automatically identifies added, removed, and reordered attributes
