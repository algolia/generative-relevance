# 🧠 Generative Relevance CLI

> **AI-powered Algolia configuration generation** - Analyze your data and generate intelligent search settings automatically.

## ✨ Features

- 🤖 **AI-Generated Settings** - Leverages LLMs to determine optimal configurations
- 🔄 **Configuration Comparison** - Compare existing vs. AI-suggested configurations side-by-side  
- ⚡ **Multi-Model Support** - Compare outputs from different AI models simultaneously
- 🎯 **Selective Generation** - Generate only specific configuration types (searchable, ranking, faceting, sortable)
- 💡 **Detailed Reasoning** - Understand the AI's decision-making process
- 💰 **Cost Analysis** - Track and compare costs across different models

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- API keys for your preferred AI provider:
  - [Anthropic API Key](https://console.anthropic.com/) (for Claude models)
  - [OpenAI API Key](https://platform.openai.com/) (for GPT models)

### Installation

```sh
npm install
```

### Setup

Create a `.env` file in the project root:

```sh
# For Claude models (default)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# For OpenAI models  
OPENAI_API_KEY=your_openai_api_key_here
```

## 📖 Usage

### 🔍 Analyze Command

Generate AI configuration suggestions from your JSON data **or** directly from an Algolia index:

#### JSON File Analysis
```sh
npm start -- analyze <json-file> [options]
```

#### Algolia Index Analysis  
```sh
npm start -- analyze <appId> --api-key <apiKey> --index <indexName> [options]
```

| Option | Description |
|--------|-------------|
| `<json-file>` or `<appId>` | Path to JSON file **OR** Algolia App ID |
| `--api-key <key>` | Algolia Admin API Key (required for index analysis) |
| `--index <name>` | Algolia Index Name (required for index analysis) |
| `-l, --limit <number>` | Number of records to analyze (default: 10) |
| `-v, --verbose` | Show detailed AI reasoning for each configuration |
| `--searchable` | Generate searchable attributes only |
| `--ranking` | Generate custom ranking only |
| `--faceting` | Generate attributes for faceting only |
| `--sortable` | Generate sortable attributes only |
| `-m, --model <model>` | Choose AI model (see [Models](#-available-models)) |
| `--compare-models <models>` | Compare two models (format: `model1,model2`) |
| `-i, --interactive` | Enable interactive mode to apply configurations |

### 🔄 Compare Command  
Compare your existing Algolia index with AI suggestions:

```sh
npm start -- compare <appId> <apiKey> <indexName> [options]
```

| Option | Description |
|--------|-------------|
| `<appId>` | Your Algolia App ID |
| `<apiKey>` | Your Algolia Admin API Key |
| `<indexName>` | Name of the Algolia index to compare |
| *All other options* | Same as `analyze` command |

> [!NOTE]  
> Your Algolia credentials are only used to retrieve indices, they're never sent to LLMs.

## 💡 Examples

### 🔍 Analyze Examples

<details>
<summary><strong>JSON File Analysis</strong></summary>

```sh
# Quick analysis with default settings
npm start -- analyze datasets/products/clean.json

# Detailed analysis with AI reasoning  
npm start -- analyze datasets/products/clean.json --verbose

# Analyze only 5 records with detailed output
npm start -- analyze datasets/products/clean.json --limit 5 --verbose
```
</details>

<details>
<summary><strong>Algolia Index Analysis</strong></summary>

```sh
# Analyze live Algolia index data
npm start -- analyze YOUR_APP_ID --api-key YOUR_API_KEY --index your_index_name

# Detailed index analysis with reasoning
npm start -- analyze YOUR_APP_ID --api-key YOUR_API_KEY --index your_index_name --verbose

# Analyze only 20 records from index
npm start -- analyze YOUR_APP_ID --api-key YOUR_API_KEY --index your_index_name --limit 20
```
</details>

<details>
<summary><strong>Interactive Configuration Application</strong></summary>

```sh
# Analyze JSON file and interactively apply configurations
npm start -- analyze datasets/products/clean.json --interactive

# Analyze live index and apply selected configurations
npm start -- analyze YOUR_APP_ID --api-key YOUR_API_KEY --index your_index_name --interactive --verbose

# Interactive mode prompts you to:
# 1. Select which configurations to apply
# 2. Preview changes before applying  
# 3. Apply configurations to your Algolia index
```
</details>

<details>
<summary><strong>Selective Configuration</strong></summary>

```sh
# Generate only searchable attributes (JSON file)
npm start -- analyze datasets/products/clean.json --searchable

# Generate only custom ranking with reasoning (Algolia index)
npm start -- analyze YOUR_APP_ID --api-key YOUR_API_KEY --index your_index_name --ranking --verbose

# Generate faceting and sortable attributes
npm start -- analyze datasets/products/clean.json --faceting --sortable
```
</details>

<details>
<summary><strong>Model Comparison</strong></summary>

```sh
# Compare two models side-by-side (JSON file)
npm start -- analyze datasets/products/clean.json --compare-models claude-3-5-sonnet-latest,gpt-4.1-nano

# Compare models with detailed reasoning (Algolia index)
npm start -- analyze YOUR_APP_ID --api-key YOUR_API_KEY --index your_index_name --compare-models claude-3-5-haiku-latest,claude-3-5-sonnet-latest --verbose
```
</details>

### 🔄 Compare Examples

<details>
<summary><strong>Index Comparison</strong></summary>

```sh
# Compare your existing index with AI suggestions
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --verbose

# Compare specific configuration types only
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --searchable --ranking

# Triple comparison: Index vs Model A vs Model B
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --compare-models claude-3-5-sonnet-latest,gpt-4.1-nano --verbose

# Interactive comparison - apply configurations after comparing
npm start -- compare YOUR_APP_ID YOUR_API_KEY your_index_name --interactive
```
</details>

## 📊 Output Types

The CLI generates four types of AI configuration suggestions:

| Type | Icon | Description |
|------|------|-------------|
| **Searchable Attributes** | 🔍 | Attributes users can search for |
| **Custom Ranking** | 📊 | Attributes for relevance ranking |
| **Attributes for Faceting** | 🏷️ | Attributes for filtering |  
| **Sortable Attributes** | 🔀 | Attributes for sorting results (creates replica indexes) |

> **💡 Pro Tip**: Use the `--verbose` flag to see detailed AI reasoning behind each recommendation.

## 🤖 Available Models

| Provider | Model | Speed | Cost |
|----------|-------|-------|------|
| **Anthropic** | `claude-3-5-haiku-latest` (default) | ⚡⚡⚡ | 💰 |
| **Anthropic** | `claude-3-5-sonnet-latest` | ⚡⚡ | 💰💰 |
| **OpenAI** | `gpt-4.1-nano` | ⚡⚡⚡ | 💰 |

## 🔄 Model Comparison Benefits

### 🔍 For Analysis

- **Cross-validation** - See different AI perspectives on your data
- **Quality assurance** - Identify consensus recommendations  
- **Model selection** - Choose the best approach for your use case

### 🔄 For Index Comparison

- **Triple comparison** - Current configuration vs. Model A vs. Model B
- **Optimization insights** - See how different AIs would improve your setup
- **Cost vs. quality** - Compare expensive vs. cost-effective models

## 🤖 Interactive Mode

The CLI includes an interactive mode (`-i, --interactive`) that allows you to apply AI-generated configurations directly to your Algolia index.

### 🚀 How it Works

1. **Generate configurations** - AI analyzes your data and suggests optimizations
2. **Display results** - View all suggestions with detailed reasoning (if `--verbose`)
3. **Interactive prompts** - Choose which configurations to apply
4. **Preview changes** - See exactly what will be modified
5. **Apply to Algolia** - Automatically update your index settings

### 🔧 Special Handling for Sortable Attributes

Unlike other Algolia settings, sortable attributes require creating **replica indexes**:

- **Input**: AI suggests `["desc(price)", "asc(created_at)"]`
- **Process**: Creates replica indexes `myindex_price_desc` and `myindex_created_at_asc`
- **Result**: Users can sort by price (high to low) and creation date (oldest first)

#### Replica Creation Process

1. **Parse sort attributes** - Extract attribute name and direction from `desc(price)` format
2. **Check existing replicas** - Avoid creating duplicates 
3. **Add to main index** - Update `replicas` setting with new replica names
4. **Configure replicas** - Set custom ranking for each replica with sort attribute first
5. **Error handling** - Continue if individual replicas fail

### 🛡️ Safety Features

- **Preview before applying** - Shows exact changes before modifying your index
- **Selective application** - Choose individual configuration types to apply
- **Credential validation** - Prompts for Algolia credentials when not provided
- **Graceful error handling** - Continues applying other configurations if one fails
- **Existing replica detection** - Won't recreate already existing sort options

### ⚠️ Limitations

- Interactive mode is **not available** with `--compare-models` flag
- Requires **Admin API key** to modify index settings
- **Replica creation** has a 2-second delay to allow Algolia processing

## 📁 Available Datasets

This project includes three sample datasets for testing and demonstration:

### 📰 Articles dataset (`datasets/articles/clean.json`)
- **Size**: 100 news articles
- **Attributes**: `title`, `authors`, `date`, `content`, `tags`, `viewCount`, `commentCount`
- **Use case**: Content discovery, news search, article recommendation systems

### 🛍️ Products dataset (`datasets/products/clean.json`)
- **Size**: 100 products
- **Attributes**: `name`, `description`, `price`, `brand`, `color`, `material`, `inventory`, `rating`, `categories`, `in_stock`
- **Use case**: E-commerce search, product filtering, price comparison

### 💼 Companies dataset (`datasets/companies/clean.json`) 
- **Size**: 100 SaaS company profiles
- **Attributes**: `name`, `description`, `industry`, `specializations`, `employeeCount`, `headquarters`, `locations`, `customers`, `foundingDate`
- **Use case**: B2B discovery, company search, industry analysis

## 🛠️ Development Commands

```sh
npm start          # Run the CLI
npm run lint       # Run ESLint
npm test           # Run tests
```
