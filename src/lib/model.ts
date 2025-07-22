import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { LanguageModelV1 } from 'ai';

export const DEFAULT_MODEL = 'claude-3-5-haiku-latest';

interface ModelPricing {
  inputTokenCost: number; // Cost per 1M tokens
  outputTokenCost: number; // Cost per 1M tokens
}

interface ModelConfig {
  provider: 'anthropic' | 'openai';
  pricing: ModelPricing;
}

// https://docs.anthropic.com/en/docs/about-claude/models/overview#model-pricing
// https://openai.com/api/pricing/
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'claude-3-5-haiku-latest': {
    provider: 'anthropic',
    pricing: {
      inputTokenCost: 0.8,
      outputTokenCost: 4,
    },
  },
  'claude-3-5-sonnet-latest': {
    provider: 'anthropic',
    pricing: {
      inputTokenCost: 3,
      outputTokenCost: 15,
    },
  },
  'gpt-4.1-nano': {
    provider: 'openai',
    pricing: {
      inputTokenCost: 0.1,
      outputTokenCost: 0.4,
    },
  },
} as const;

const SUPPORTED_MODELS = Object.keys(MODEL_CONFIGS);

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

export function createModel(modelName: string = DEFAULT_MODEL) {
  const config = MODEL_CONFIGS[modelName];
  if (!config) {
    throw new Error(
      `Unsupported model: ${modelName}. Supported models: ${SUPPORTED_MODELS.join(
        ', '
      )}`
    );
  }

  if (config.provider === 'openai') {
    return openai(modelName);
  }

  return anthropic(modelName);
}

export function getModelProvider(modelName: string): 'anthropic' | 'openai' {
  const config = MODEL_CONFIGS[modelName];

  return config?.provider || 'anthropic';
}

export function getModelName(customModel?: LanguageModelV1): string {
  if (!customModel) {
    return DEFAULT_MODEL;
  }

  return customModel.modelId;
}

export function getModelPricing(modelName: string): ModelPricing | null {
  const config = MODEL_CONFIGS[modelName];
  return config?.pricing || null;
}

export const model = createModel();
