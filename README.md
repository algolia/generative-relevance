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
- Algolia account with App ID and Admin API Key
- Anthropic account with API Key

### Environment Variables

Create a `.env.local` file with your API keys:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key
SEGMENT_WRITE_KEY=your_segment_write_key
NEXT_PUBLIC_SEGMENT_WRITE_KEY=your_segment_write_key
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

### CLI Examples

Basic analysis:
```bash
npm run cli analyze datasets/products/clean.json
```

Analyze with detailed reasoning:
```bash
npm run cli analyze datasets/products/clean.json -- --verbose
```

Limit to 5 records with verbose output:
```bash
npm run cli analyze datasets/products/clean.json -- --limit 5 --verbose
```

### CLI Output

The CLI generates four types of AI configuration suggestions:

1. **🔍 Searchable Attributes** - Attributes users can search for
2. **📊 Custom Ranking** - Attributes for relevance ranking
3. **🏷️ Attributes for Faceting** - Attributes for filtering
4. **🔀 Sortable Attributes** - Attributes for sorting results

Each suggestion includes the recommended attributes and optional detailed reasoning (with `--verbose` flag).
