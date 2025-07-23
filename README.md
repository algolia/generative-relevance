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

Generate AI configuration suggestions from your JSON data:

```sh
npm start -- analyze <json-file> [options]
```

| Option | Description |
|--------|-------------|
| `<json-file>` | Path to JSON file containing an array of records |
| `-l, --limit <number>` | Number of records to analyze (default: 10) |
| `-v, --verbose` | Show detailed AI reasoning for each configuration |
| `--searchable` | Generate searchable attributes only |
| `--ranking` | Generate custom ranking only |
| `--faceting` | Generate attributes for faceting only |
| `--sortable` | Generate sortable attributes only |
| `-m, --model <model>` | Choose AI model (see [Models](#-available-models)) |
| `--compare-models <models>` | Compare two models (format: `model1,model2`) |

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
<summary><strong>Basic Usage</strong></summary>

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
<summary><strong>Selective Configuration</strong></summary>

```sh
# Generate only searchable attributes
npm start -- analyze datasets/products/clean.json --searchable

# Generate only custom ranking with reasoning
npm start -- analyze datasets/products/clean.json --ranking --verbose

# Generate faceting and sortable attributes
npm start -- analyze datasets/products/clean.json --faceting --sortable
```
</details>

<details>
<summary><strong>Model Comparison</strong></summary>

```sh
# Compare two models side-by-side
npm start -- analyze datasets/products/clean.json --compare-models claude-3-5-sonnet-latest,gpt-4.1-nano

# Compare models with detailed reasoning
npm start -- analyze datasets/products/clean.json --compare-models claude-3-5-haiku-latest,claude-3-5-sonnet-latest --verbose
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
```
</details>

## 📊 Output Types

The CLI generates four types of AI configuration suggestions:

| Type | Icon | Description |
|------|------|-------------|
| **Searchable Attributes** | 🔍 | Attributes users can search for |
| **Custom Ranking** | 📊 | Attributes for relevance ranking |
| **Attributes for Faceting** | 🏷️ | Attributes for filtering |  
| **Sortable Attributes** | 🔀 | Attributes for sorting results |

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
