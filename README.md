# Generative Relevance

Demo of an AI-powered tool that automatically optimizes Algolia search configurations by analyzing your data and generating intelligent search settings.

## Features

- **AI-Generated Settings**: Leverages AI to determine optimal searchable attributes, custom ranking, and faceting configuration
- **Smart Replica Management**: Automatically creates sort-by replicas for relevant fields

## Getting Started

### Prerequisites

- Node.js 22+ 
- Algolia account with App ID and Admin API Key
- Anthropic account with API Key

### Environment Variables

Create a `.env.local` file with your Anthropic API key:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.
